import os
from abc import ABC, abstractmethod
from datetime import timedelta
from pathlib import Path
from typing import Optional

from app.config import settings


class StorageBackend(ABC):
    """Abstract base class for storage backends."""

    @abstractmethod
    def upload_file(self, file_content: bytes, destination_path: str, content_type: Optional[str] = None) -> str:
        """Upload a file and return the storage path."""
        pass

    @abstractmethod
    def get_file_url(self, storage_path: str) -> str:
        """Get a URL to access the file."""
        pass

    @abstractmethod
    def delete_file(self, storage_path: str) -> bool:
        """Delete a file from storage."""
        pass


class LocalStorage(StorageBackend):
    """Local filesystem storage backend for development."""

    def __init__(self, base_path: str, base_url: str):
        self.base_path = Path(base_path)
        self.base_url = base_url.rstrip("/")
        self.base_path.mkdir(parents=True, exist_ok=True)

    def upload_file(self, file_content: bytes, destination_path: str, content_type: Optional[str] = None) -> str:
        """Upload a file to local filesystem."""
        file_path = self.base_path / destination_path
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(file_content)

        return destination_path

    def get_file_url(self, storage_path: str) -> str:
        """Get a URL to access the file from local storage."""
        # Remove any prefix like "local://" if present
        if storage_path.startswith("local://"):
            storage_path = storage_path[8:]
        return f"{self.base_url}/{storage_path}"

    def delete_file(self, storage_path: str) -> bool:
        """Delete a file from local storage."""
        if storage_path.startswith("local://"):
            storage_path = storage_path[8:]

        file_path = self.base_path / storage_path
        try:
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception:
            return False


class GCSStorage(StorageBackend):
    """Google Cloud Storage backend for production."""

    def __init__(self):
        from google.cloud import storage as gcs_storage
        if settings.google_application_credentials:
            self.client = gcs_storage.Client.from_service_account_json(
                settings.google_application_credentials
            )
        else:
            self.client = gcs_storage.Client(project=settings.gcs_project_id)
        self.bucket_name = settings.gcs_bucket_name

    def upload_file(self, file_content: bytes, destination_path: str, content_type: Optional[str] = None) -> str:
        """Upload a file to GCS and return the GCS path."""
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(destination_path)
        blob.upload_from_string(file_content, content_type=content_type)
        return f"gs://{self.bucket_name}/{destination_path}"

    def get_file_url(self, storage_path: str) -> str:
        """Generate a signed URL for a GCS object."""
        if storage_path.startswith("gs://"):
            path_without_prefix = storage_path[5:]
            bucket_name, blob_path = path_without_prefix.split("/", 1)
        else:
            bucket_name = self.bucket_name
            blob_path = storage_path

        bucket = self.client.bucket(bucket_name)
        blob = bucket.blob(blob_path)

        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=24 * 7),
            method="GET",
        )
        return url

    def delete_file(self, storage_path: str) -> bool:
        """Delete a file from GCS."""
        from google.cloud.exceptions import NotFound

        if storage_path.startswith("gs://"):
            path_without_prefix = storage_path[5:]
            bucket_name, blob_path = path_without_prefix.split("/", 1)
        else:
            bucket_name = self.bucket_name
            blob_path = storage_path

        try:
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            blob.delete()
            return True
        except NotFound:
            return False


# Singleton storage instance
_storage: Optional[StorageBackend] = None


def get_storage() -> StorageBackend:
    """Get the configured storage backend."""
    global _storage
    if _storage is None:
        if settings.use_local_storage:
            _storage = LocalStorage(
                base_path=settings.local_storage_path,
                base_url=settings.media_base_url
            )
        else:
            _storage = GCSStorage()
    return _storage


# Convenience functions for backward compatibility
def upload_file(file_content: bytes, destination_path: str, content_type: Optional[str] = None) -> str:
    """Upload a file using the configured storage backend."""
    return get_storage().upload_file(file_content, destination_path, content_type)


def get_file_url(storage_path: str) -> str:
    """Get a URL for a file using the configured storage backend."""
    return get_storage().get_file_url(storage_path)


def delete_file(storage_path: str) -> bool:
    """Delete a file using the configured storage backend."""
    return get_storage().delete_file(storage_path)
