from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import anthropic
import os
import uuid
import aiofiles
import logging
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import init_db, get_db, Conversation, Contact, DataSource
import rag_engine
import requests
from bs4 import BeautifulSoup

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Customer Service Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init DB on startup
@app.on_event("startup")
async def startup():
    init_db()
    os.makedirs("./data/pdfs", exist_ok=True)
    os.makedirs("./data/chroma", exist_ok=True)
    logger.info("Database initialized")
    # Resume any pending/processing sources that were interrupted
    import threading
    threading.Thread(target=_resume_pending_sources, daemon=True).start()


def _resume_pending_sources():
    import concurrent.futures
    from database import SessionLocal
    db = SessionLocal()
    try:
        stuck = db.query(DataSource).filter(
            DataSource.status.in_(["pending", "processing"])
        ).all()
        if not stuck:
            return
        logger.info(f"Resuming {len(stuck)} interrupted sources in parallel...")
        # Reset all to pending first
        for source in stuck:
            source.status = "pending"
        db.commit()
        sources_data = [(s.id, s.source_type, s.source_path, s.name) for s in stuck]
    finally:
        db.close()

    def _process_one(item):
        sid, stype, spath, sname = item
        try:
            if stype == "pdf" and os.path.exists(spath):
                process_pdf_background(sid, spath, sname)
            elif stype == "url":
                process_url_background(sid, spath)
        except Exception as e:
            logger.error(f"Error resuming source {sid}: {e}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        executor.map(_process_one, sources_data)


# ─── Models ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    session_id: str
    message: str

class ContactData(BaseModel):
    session_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None

class InstructionsUpdate(BaseModel):
    instructions: str

class UrlIngest(BaseModel):
    url: str

class SiteCrawl(BaseModel):
    url: str
    max_pages: int = 100
    exclude_patterns: list[str] = []


# ─── Instructions ─────────────────────────────────────────────────────────────

INSTRUCTIONS_FILE = "./data/instructions.txt"

def read_instructions() -> str:
    if os.path.exists(INSTRUCTIONS_FILE):
        with open(INSTRUCTIONS_FILE, "r", encoding="utf-8") as f:
            return f.read()
    return ""

@app.get("/api/instructions")
def get_instructions():
    return {"instructions": read_instructions()}

@app.put("/api/instructions")
def update_instructions(data: InstructionsUpdate):
    with open(INSTRUCTIONS_FILE, "w", encoding="utf-8") as f:
        f.write(data.instructions)
    return {"ok": True}


# ─── Chat ─────────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(data: ChatMessage, db: Session = Depends(get_db)):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    # Save user message
    db.add(Conversation(session_id=data.session_id, role="user", content=data.message))
    db.commit()

    # Get conversation history (last 10 turns)
    history = db.query(Conversation)\
        .filter(Conversation.session_id == data.session_id)\
        .order_by(Conversation.timestamp.asc())\
        .all()

    # Search relevant context
    context_docs = rag_engine.search(data.message, n_results=6)

    # Build context block
    if context_docs:
        context_text = "\n\n---\n\n".join(
            f"[Fuente: {d['source']}]\n{d['content']}" for d in context_docs
        )
        context_block = f"\n\n=== INFORMACIÓN DISPONIBLE EN LA BASE DE CONOCIMIENTO ===\n{context_text}\n=== FIN DE LA INFORMACIÓN ==="
    else:
        context_block = "\n\n[No se encontró información relevante en la base de conocimiento para esta consulta.]"

    instructions = read_instructions()
    system_prompt = instructions + context_block

    # Build messages for Claude
    messages = []
    for msg in history[:-1]:  # Exclude last user message (already added)
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": data.message})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=messages
        )
        assistant_message = response.content[0].text
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Save assistant response
    db.add(Conversation(session_id=data.session_id, role="assistant", content=assistant_message))
    db.commit()

    return {
        "response": assistant_message,
        "sources": [{"source": d["source"], "type": d["source_type"]} for d in context_docs]
    }


# ─── Contact ──────────────────────────────────────────────────────────────────

@app.post("/api/contact")
def save_contact(data: ContactData, db: Session = Depends(get_db)):
    contact = Contact(
        session_id=data.session_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        message=data.message
    )
    db.add(contact)
    db.commit()
    return {"ok": True, "id": contact.id}

@app.get("/api/contacts")
def list_contacts(db: Session = Depends(get_db)):
    contacts = db.query(Contact).order_by(Contact.timestamp.desc()).all()
    return [
        {
            "id": c.id,
            "session_id": c.session_id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "message": c.message,
            "timestamp": c.timestamp.isoformat(),
            "resolved": c.resolved
        }
        for c in contacts
    ]

@app.put("/api/contacts/{contact_id}/resolve")
def resolve_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404)
    contact.resolved = not contact.resolved
    db.commit()
    return {"ok": True, "resolved": contact.resolved}


# ─── Conversations ────────────────────────────────────────────────────────────

@app.get("/api/conversations")
def list_conversations(db: Session = Depends(get_db)):
    # Get unique sessions with message count and last message
    from sqlalchemy import func
    sessions = db.query(
        Conversation.session_id,
        func.count(Conversation.id).label("count"),
        func.max(Conversation.timestamp).label("last_msg")
    ).group_by(Conversation.session_id).order_by(func.max(Conversation.timestamp).desc()).all()

    result = []
    for s in sessions:
        first_msg = db.query(Conversation).filter(
            Conversation.session_id == s.session_id,
            Conversation.role == "user"
        ).order_by(Conversation.timestamp.asc()).first()
        result.append({
            "session_id": s.session_id,
            "message_count": s.count,
            "last_message": s.last_msg.isoformat() if s.last_msg else None,
            "preview": first_msg.content[:100] if first_msg else ""
        })
    return result

@app.get("/api/conversations/{session_id}")
def get_conversation(session_id: str, db: Session = Depends(get_db)):
    messages = db.query(Conversation)\
        .filter(Conversation.session_id == session_id)\
        .order_by(Conversation.timestamp.asc())\
        .all()
    return [
        {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat()}
        for m in messages
    ]

@app.delete("/api/conversations/{session_id}")
def delete_conversation(session_id: str, db: Session = Depends(get_db)):
    db.query(Conversation).filter(Conversation.session_id == session_id).delete()
    db.commit()
    return {"ok": True}


# ─── Data Sources ─────────────────────────────────────────────────────────────

def process_pdf_background(source_id: int, file_path: str, source_name: str):
    from database import SessionLocal
    db = SessionLocal()
    try:
        source = db.query(DataSource).filter(DataSource.id == source_id).first()
        source.status = "processing"
        db.commit()
        chunks = rag_engine.index_pdf(file_path, source_name, source_id)
        source.status = "indexed"
        source.chunks_count = chunks
        db.commit()
    except Exception as e:
        logger.error(f"Error indexing PDF {source_name}: {e}")
        source = db.query(DataSource).filter(DataSource.id == source_id).first()
        source.status = "error"
        source.error_message = str(e)
        db.commit()
    finally:
        db.close()


def process_url_background(source_id: int, url: str):
    from database import SessionLocal
    db = SessionLocal()
    try:
        source = db.query(DataSource).filter(DataSource.id == source_id).first()
        source.status = "processing"
        db.commit()
        title, chunks = rag_engine.index_url(url, source_id)
        source.name = title
        source.status = "indexed"
        source.chunks_count = chunks
        db.commit()
    except Exception as e:
        logger.error(f"Error indexing URL {url}: {e}")
        source = db.query(DataSource).filter(DataSource.id == source_id).first()
        source.status = "error"
        source.error_message = str(e)
        db.commit()
    finally:
        db.close()


@app.post("/api/sources/pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    file_path = f"./data/pdfs/{uuid.uuid4()}_{file.filename}"
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    source = DataSource(
        name=file.filename,
        source_type="pdf",
        source_path=file_path,
        status="pending"
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    background_tasks.add_task(process_pdf_background, source.id, file_path, file.filename)
    return {"id": source.id, "name": source.name, "status": "pending"}


@app.post("/api/sources/url")
async def add_url(
    background_tasks: BackgroundTasks,
    data: UrlIngest,
    db: Session = Depends(get_db)
):
    source = DataSource(
        name=data.url,
        source_type="url",
        source_path=data.url,
        status="pending"
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    background_tasks.add_task(process_url_background, source.id, data.url)
    return {"id": source.id, "name": data.url, "status": "pending"}


@app.get("/api/sources")
def list_sources(db: Session = Depends(get_db)):
    sources = db.query(DataSource).order_by(DataSource.timestamp.desc()).all()
    stats = rag_engine.get_stats()
    return {
        "sources": [
            {
                "id": s.id,
                "name": s.name,
                "source_type": s.source_type,
                "status": s.status,
                "chunks_count": s.chunks_count,
                "error_message": s.error_message,
                "timestamp": s.timestamp.isoformat()
            }
            for s in sources
        ],
        "total_chunks": stats["total_chunks"]
    }


@app.delete("/api/sources/{source_id}")
def delete_source(source_id: int, db: Session = Depends(get_db)):
    source = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404)
    rag_engine.delete_source(source_id)
    db.delete(source)
    db.commit()
    return {"ok": True}



# ─── Crawler ──────────────────────────────────────────────────────────────────

# In-memory crawler status
crawler_status = {"running": False, "total": 0, "done": 0, "found": 0, "current": "", "skipped": 0}

def _crawl_site(base_url: str, max_pages: int, exclude_patterns: list = []):
    from urllib.parse import urljoin, urlparse
    from database import SessionLocal
    import time

    crawler_status["running"] = True
    crawler_status["total"] = 0
    crawler_status["done"] = 0
    crawler_status["found"] = 0
    crawler_status["skipped"] = 0
    crawler_status["current"] = base_url

    parsed_base = urlparse(base_url)
    base_domain = parsed_base.netloc

    visited = set()
    to_visit = [base_url]
    found_urls = []

    headers = {"User-Agent": "Mozilla/5.0 (compatible; CustomerServiceBot/1.0)"}

    # Phase 1: discover all URLs
    logger.info(f"Crawling {base_url} — max {max_pages} pages")
    while to_visit and len(found_urls) < max_pages:
        url = to_visit.pop(0)
        if url in visited:
            continue
        visited.add(url)
        crawler_status["current"] = url

        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if "text/html" not in resp.headers.get("content-type", ""):
                continue
            soup = BeautifulSoup(resp.content, "lxml")
            found_urls.append(url)
            crawler_status["found"] = len(found_urls)

            # Discover new links
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if not href or href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
                    continue
                full = urljoin(url, href).split("#")[0].split("?")[0]
                p = urlparse(full)
                if p.netloc == base_domain and full not in visited and full not in to_visit:
                    skip_ext = (".pdf", ".jpg", ".png", ".gif", ".svg", ".css", ".js", ".zip", ".xml")
                    if any(p.path.lower().endswith(e) for e in skip_ext):
                        continue
                    # Check user-defined exclude patterns
                    if any(pat.strip() and pat.strip() in full for pat in exclude_patterns):
                        continue
                    to_visit.append(full)
        except Exception as e:
            logger.warning(f"Crawl skip {url}: {e}")

    crawler_status["total"] = len(found_urls)
    logger.info(f"Crawl found {len(found_urls)} pages. Indexing...")

    # Phase 2: index each page
    db = SessionLocal()
    try:
        for url in found_urls:
            crawler_status["current"] = url
            # Re-check exclude patterns at index time (in case patterns changed)
            if any(pat.strip() and pat.strip() in url for pat in exclude_patterns):
                crawler_status["skipped"] += 1
                continue
            # Check if already indexed
            existing = db.query(DataSource).filter(
                DataSource.source_path == url,
                DataSource.source_type == "url"
            ).first()
            if existing:
                crawler_status["done"] += 1
                continue

            source = DataSource(name=url, source_type="url", source_path=url, status="pending")
            db.add(source)
            db.commit()
            db.refresh(source)
            process_url_background(source.id, url)
            crawler_status["done"] += 1
    finally:
        db.close()

    crawler_status["running"] = False
    crawler_status["current"] = ""
    logger.info("Crawl complete.")


@app.post("/api/sources/crawl")
async def crawl_site(background_tasks: BackgroundTasks, data: SiteCrawl):
    if crawler_status["running"]:
        raise HTTPException(status_code=409, detail="Ya hay un crawl en curso")
    background_tasks.add_task(_crawl_site, data.url, data.max_pages, data.exclude_patterns)
    return {"ok": True, "message": f"Crawl iniciado para {data.url}"}


@app.get("/api/sources/crawl/status")
def crawl_status():
    return crawler_status


@app.get("/api/health")
def health():
    return {"status": "ok"}
