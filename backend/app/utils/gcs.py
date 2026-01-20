import os
from datetime import timedelta
from typing import Optional
from google.cloud import storage
from google.cloud.exceptions import NotFound

from app.config import settings


def get_storage_client() -> storage.Client:
    if settings.google_application_credentials:
        return storage.Client.from_service_account_json(settings.google_application_credentials)
    return storage.Client(project=settings.gcs_project_id)


def upload_file_to_gcs(
    file_content: bytes,
    destination_path: str,
    content_type: Optional[str] = None
) -> str:
    """Upload a file to GCS and return the GCS path."""
    client = get_storage_client()
    bucket = client.bucket(settings.gcs_bucket_name)
    blob = bucket.blob(destination_path)

    blob.upload_from_string(file_content, content_type=content_type)

    return f"gs://{settings.gcs_bucket_name}/{destination_path}"


def generate_signed_url(gcs_path: str, expiration_hours: int = 24 * 7) -> str:
    """Generate a signed URL for a GCS object."""
    # Extract bucket and blob path from gs:// URL
    if gcs_path.startswith("gs://"):
        path_without_prefix = gcs_path[5:]
        bucket_name, blob_path = path_without_prefix.split("/", 1)
    else:
        bucket_name = settings.gcs_bucket_name
        blob_path = gcs_path

    client = get_storage_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=expiration_hours),
        method="GET",
    )

    return url


def delete_file_from_gcs(gcs_path: str) -> bool:
    """Delete a file from GCS."""
    if gcs_path.startswith("gs://"):
        path_without_prefix = gcs_path[5:]
        bucket_name, blob_path = path_without_prefix.split("/", 1)
    else:
        bucket_name = settings.gcs_bucket_name
        blob_path = gcs_path

    try:
        client = get_storage_client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_path)
        blob.delete()
        return True
    except NotFound:
        return False
