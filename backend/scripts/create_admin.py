#!/usr/bin/env python3
"""
Create initial admin user.
Usage: python -m scripts.create_admin
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.utils.security import get_password_hash


def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.email == "admin@example.com").first()
        if existing:
            print("Admin user already exists")
            return

        # Create admin user
        admin = User(
            email="admin@example.com",
            password_hash=get_password_hash("admin123"),
            name="管理者",
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.commit()

        print("Admin user created successfully!")
        print("Email: admin@example.com")
        print("Password: admin123")
        print("\nPlease change the password after first login.")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
