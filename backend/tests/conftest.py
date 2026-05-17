"""Pytest configuration — patches Motor's AsyncIOMotorClient with an async-compatible
mongomock wrapper before any test module imports server or github_scraper.
"""
import sys
import mongomock
import motor.motor_asyncio


class _AsyncCursor:
    def __init__(self, cursor):
        self._cursor = cursor

    def sort(self, *args, **kwargs):
        self._cursor = self._cursor.sort(*args, **kwargs)
        return self

    def skip(self, n):
        self._cursor = self._cursor.skip(n)
        return self

    def limit(self, n):
        self._cursor = self._cursor.limit(n)
        return self

    async def to_list(self, length=None):
        return list(self._cursor)

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class _AwaitableResult:
    """Wraps a sync result so it can be both used synchronously AND awaited."""
    def __init__(self, value):
        self._value = value

    def __await__(self):
        async def _inner():
            return self._value
        return _inner().__await__()

    def __getattr__(self, name):
        return getattr(self._value, name)

    def __getitem__(self, key):
        return self._value[key]

    def __iter__(self):
        return iter(self._value)

    def __len__(self):
        return len(self._value)

    def __repr__(self):
        return repr(self._value)

    def __str__(self):
        return str(self._value)

    def __contains__(self, item):
        return item in self._value

    def __eq__(self, other):
        return self._value == other

    def __hash__(self):
        return hash(self._value)


class _AsyncCollection:
    def __init__(self, coll):
        self._coll = coll

    def __getattr__(self, name):
        attr = getattr(self._coll, name)
        if callable(attr):
            if name in ("find", "aggregate", "list_indexes"):
                def _cursor_wrapper(*args, **kwargs):
                    return _AsyncCursor(attr(*args, **kwargs))
                return _cursor_wrapper
            else:
                def _async_wrapper(*args, **kwargs):
                    return _AwaitableResult(attr(*args, **kwargs))
                return _async_wrapper
        return attr

    def __getitem__(self, name):
        return _AsyncCollection(self._coll[name])


class _AsyncDatabase:
    def __init__(self, db):
        self._db = db
        self._collection_cache = {}

    def __getattr__(self, name):
        attr = getattr(self._db, name)
        if isinstance(attr, mongomock.collection.Collection):
            if name not in self._collection_cache:
                self._collection_cache[name] = _AsyncCollection(attr)
            return self._collection_cache[name]
        return attr

    def __getitem__(self, name):
        if name not in self._collection_cache:
            self._collection_cache[name] = _AsyncCollection(self._db[name])
        return self._collection_cache[name]


class _AsyncMongoClient:
    def __init__(self, *args, **kwargs):
        self._client = mongomock.MongoClient()
        self._db_cache = {}

    def __getattr__(self, name):
        if name not in self._db_cache:
            self._db_cache[name] = _AsyncDatabase(getattr(self._client, name))
        return self._db_cache[name]

    def __getitem__(self, name):
        if name not in self._db_cache:
            self._db_cache[name] = _AsyncDatabase(self._client[name])
        return self._db_cache[name]


# Force re-import of server/github_scraper if they were already loaded
for mod in list(sys.modules.keys()):
    if mod == "server" or mod.startswith("github_scraper"):
        del sys.modules[mod]

motor.motor_asyncio.AsyncIOMotorClient = _AsyncMongoClient
