"""SQLite document store used by the API without an external database."""

import json
import os
import re
import sqlite3
from pathlib import Path
from types import SimpleNamespace

ROOT_DIR = Path(__file__).parent
DATABASE_PATH = Path(os.environ.get("SQLITE_PATH", ROOT_DIR.parent / "data" / "salonapp.db"))
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)


def _json_default(value):
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _matches(document, query):
    for key, expected in query.items():
        if key == "$or":
            if not any(_matches(document, branch) for branch in expected):
                return False
            continue
        actual = document.get(key)
        if isinstance(expected, dict):
            for operator, operand in expected.items():
                if operator == "$options":
                    continue
                if operator == "$regex":
                    flags = re.IGNORECASE if expected.get("$options") == "i" else 0
                    if re.search(str(operand), str(actual or ""), flags) is None:
                        return False
                elif operator == "$gte" and (actual is None or actual < operand):
                    return False
                elif operator == "$lte" and (actual is None or actual > operand):
                    return False
                elif operator == "$gt" and (actual is None or actual <= operand):
                    return False
                elif operator == "$lt" and (actual is None or actual >= operand):
                    return False
            continue
        if actual != expected:
            return False
    return True


def _project(document, projection):
    if not projection:
        return dict(document)
    excluded = {key for key, value in projection.items() if value == 0}
    if excluded:
        return {key: value for key, value in document.items() if key not in excluded}
    return {key: document[key] for key, value in projection.items() if value and key in document}


class Cursor:
    def __init__(self, documents):
        self.documents = documents

    def sort(self, key, direction=1):
        self.documents.sort(key=lambda item: (item.get(key) is None, item.get(key)), reverse=direction < 0)
        return self

    async def to_list(self, length=None):
        return self.documents if length is None else self.documents[:length]


class Collection:
    def __init__(self, store, name):
        self.store = store
        self.name = name

    def _all(self):
        rows = self.store.connection.execute("SELECT document FROM documents WHERE collection = ?", (self.name,)).fetchall()
        return [json.loads(row[0]) for row in rows]

    async def create_index(self, *args, **kwargs):
        return None

    async def find_one(self, query=None, projection=None):
        for document in self._all():
            if _matches(document, query or {}):
                return _project(document, projection)
        return None

    def find(self, query=None, projection=None):
        return Cursor([_project(item, projection) for item in self._all() if _matches(item, query or {})])

    async def insert_one(self, document):
        key = str(document.get("id") or document.get("user_id") or document.get("key") or self.store.next_key())
        self.store.connection.execute("INSERT OR REPLACE INTO documents(collection, doc_key, document) VALUES (?, ?, ?)", (self.name, key, json.dumps(document, default=_json_default)))
        self.store.connection.commit()
        return SimpleNamespace(inserted_id=key)

    async def insert_many(self, documents):
        for document in documents:
            await self.insert_one(document)
        return SimpleNamespace(inserted_ids=[document.get("id") for document in documents])

    async def update_one(self, query, update, upsert=False):
        for document in self._all():
            if _matches(document, query):
                self.store.replace(self.name, document, self.store.apply_update(document, update))
                return SimpleNamespace(matched_count=1, modified_count=1)
        if upsert:
            document = {key: value for key, value in query.items() if not key.startswith("$")}
            document = self.store.apply_update(document, update)
            await self.insert_one(document)
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=document.get("id"))
        return SimpleNamespace(matched_count=0, modified_count=0)

    async def update_many(self, query, update):
        count = 0
        for document in self._all():
            if _matches(document, query):
                self.store.replace(self.name, document, self.store.apply_update(document, update))
                count += 1
        return SimpleNamespace(matched_count=count, modified_count=count)

    async def delete_one(self, query):
        for document in self._all():
            if _matches(document, query):
                self.store.delete(self.name, document)
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)

    async def delete_many(self, query):
        count = 0
        for document in self._all():
            if _matches(document, query):
                self.store.delete(self.name, document)
                count += 1
        return SimpleNamespace(deleted_count=count)

    async def count_documents(self, query):
        return sum(1 for document in self._all() if _matches(document, query or {}))

    def aggregate(self, pipeline):
        documents = self._all()
        for stage in pipeline:
            if "$match" in stage:
                documents = [item for item in documents if _matches(item, stage["$match"])]
            elif "$group" in stage:
                spec = stage["$group"]
                documents = [{"_id": spec.get("_id"), "total": sum(float(item.get("amount") or 0) for item in documents), "count": len(documents)}]
        return Cursor(documents)


class SQLiteStore:
    def __init__(self):
        self.connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
        self.connection.execute("CREATE TABLE IF NOT EXISTS documents (collection TEXT NOT NULL, doc_key TEXT NOT NULL, document TEXT NOT NULL, PRIMARY KEY(collection, doc_key))")
        self.connection.commit()
        self._key = 0

    def next_key(self):
        self._key += 1
        return f"generated_{self._key}"

    @staticmethod
    def apply_update(document, update):
        changed = dict(document)
        changed.update(update.get("$set", {}))
        return changed

    def replace(self, collection, old, new):
        key = str(old.get("id") or old.get("user_id") or old.get("key"))
        self.connection.execute("UPDATE documents SET document = ? WHERE collection = ? AND doc_key = ?", (json.dumps(new, default=_json_default), collection, key))
        self.connection.commit()

    def delete(self, collection, document):
        key = str(document.get("id") or document.get("user_id") or document.get("key"))
        self.connection.execute("DELETE FROM documents WHERE collection = ? AND doc_key = ?", (collection, key))
        self.connection.commit()

    def close(self):
        self.connection.close()


store = SQLiteStore()
db = SimpleNamespace(**{name: Collection(store, name) for name in ("users", "user_sessions", "clients", "services", "professionals", "appointments", "payments", "settings")})
client = store
