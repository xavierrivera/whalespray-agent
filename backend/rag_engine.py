import chromadb
from chromadb.utils import embedding_functions
import fitz  # PyMuPDF
import requests
from bs4 import BeautifulSoup
import os
import re
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

CHROMA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "chroma")
COLLECTION_NAME = "knowledge_base"


def get_chroma_client():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client


def get_collection():
    client = get_chroma_client()
    ef = embedding_functions.DefaultEmbeddingFunction()
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) <= chunk_size:
        return [text] if text else []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            # Try to break at sentence boundary
            for sep in ['. ', '.\n', '? ', '! ', '\n\n', '\n']:
                pos = text.rfind(sep, start + chunk_size // 2, end)
                if pos != -1:
                    end = pos + len(sep)
                    break
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
        if start >= len(text):
            break
    return chunks


def extract_pdf_text(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text


def scrape_url(url: str) -> Tuple[str, str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; CustomerServiceBot/1.0)"
    }
    resp = requests.get(url, headers=headers, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.content, "lxml")

    # Remove scripts, styles, nav, footer
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        tag.decompose()

    title = soup.title.string if soup.title else url

    # Get main content
    main = soup.find("main") or soup.find("article") or soup.find("div", {"id": "content"}) or soup.body
    text = main.get_text(separator="\n") if main else soup.get_text(separator="\n")
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return title, text


def index_pdf(file_path: str, source_name: str, source_id: int) -> int:
    collection = get_collection()
    text = extract_pdf_text(file_path)
    chunks = chunk_text(text)

    if not chunks:
        return 0

    ids = [f"pdf_{source_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": source_name, "source_type": "pdf", "source_id": str(source_id)} for _ in chunks]

    # Add in batches of 100
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        collection.add(
            documents=chunks[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
            ids=ids[i:i+batch_size]
        )

    return len(chunks)


def index_url(url: str, source_id: int) -> Tuple[str, int]:
    collection = get_collection()
    title, text = scrape_url(url)
    chunks = chunk_text(text)

    if not chunks:
        return title, 0

    ids = [f"url_{source_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": title, "source_type": "url", "url": url, "source_id": str(source_id)} for _ in chunks]

    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        collection.add(
            documents=chunks[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
            ids=ids[i:i+batch_size]
        )

    return title, len(chunks)


def delete_source(source_id: int):
    collection = get_collection()
    results = collection.get(where={"source_id": str(source_id)})
    if results["ids"]:
        collection.delete(ids=results["ids"])


def search(query: str, n_results: int = 6) -> List[dict]:
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return []

    n_results = min(n_results, count)
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )

    docs = []
    for i, doc in enumerate(results["documents"][0]):
        distance = results["distances"][0][i]
        if distance < 0.7:
            meta = results["metadatas"][0][i]
            docs.append({
                "content": doc,
                "source": meta.get("source", ""),
                "source_type": meta.get("source_type", ""),
                "url": meta.get("url", ""),   # URL de la página web (vacío en PDFs)
                "distance": distance
            })

    return docs


def get_stats() -> dict:
    collection = get_collection()
    return {"total_chunks": collection.count()}
