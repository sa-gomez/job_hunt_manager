"""
Blob storage abstraction.

The default implementation writes files to the local filesystem under
~/.job_hunt_manager/resumes/.  Swap LocalBlobStore for an S3BlobStore
(or similar) without touching any other code by updating get_store().
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class BlobStore(ABC):
    @abstractmethod
    async def put(self, key: str, data: bytes, content_type: str) -> None: ...

    @abstractmethod
    async def get(self, key: str) -> bytes: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...


class LocalBlobStore(BlobStore):
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir
        base_dir.mkdir(parents=True, exist_ok=True)

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    async def get(self, key: str) -> bytes:
        return (self.base_dir / key).read_bytes()

    async def delete(self, key: str) -> None:
        path = self.base_dir / key
        if path.exists():
            path.unlink()


_store: BlobStore | None = None


def get_store() -> BlobStore:
    global _store
    if _store is None:
        base = Path.home() / ".job_hunt_manager" / "resumes"
        _store = LocalBlobStore(base)
    return _store
