import json, math, sqlite3
from typing import List, Tuple
from app.core.config import settings


def _cos(a: List[float], b: List[float]) -> float:
    dot=na=nb=0.0
    for x,y in zip(a,b):
        dot += x*y
        na += x*x
        nb += y*y
    if na<=0 or nb<=0:
        return 0.0
    return dot / math.sqrt(na*nb)


def connect():
    return sqlite3.connect(settings.rag_db_path)


def init_db():
    with connect() as con:
        con.execute('CREATE TABLE IF NOT EXISTS doc_chunks(id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT, chunk_text TEXT, embedding TEXT)')
        con.commit()


def add_chunks(source: str, chunks: List[str], embeddings: List[List[float]]):
    init_db()
    with connect() as con:
        for t,e in zip(chunks, embeddings):
            con.execute('INSERT INTO doc_chunks(source, chunk_text, embedding) VALUES (?,?,?)', (source, t, json.dumps(e)))
        con.commit()


def search(query_emb: List[float], top_k: int) -> List[Tuple[str,str,float]]:
    init_db()
    rows=[]
    with connect() as con:
        for source, chunk_text, emb_json in con.execute('SELECT source, chunk_text, embedding FROM doc_chunks').fetchall():
            score = _cos(query_emb, json.loads(emb_json))
            rows.append((source, chunk_text, score))
    rows.sort(key=lambda x: x[2], reverse=True)
    return rows[:max(top_k,1)]


VECTOR_DB = []  # simple in-memory for now

def upsert_many(records):
    VECTOR_DB.extend(records)

