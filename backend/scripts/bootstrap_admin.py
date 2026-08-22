import asyncio, os, sys
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, '/app')
from app.db.base import Base
from app.models.all_models import User, UserRole

EMAIL = os.environ.get("FIRST_ADMIN_EMAIL", "admin@loyaltyapp.com")
PASSWORD = os.environ.get("FIRST_ADMIN_PASSWORD", "Admin1234!").strip()
DATABASE_URL = os.environ["DATABASE_URL"]

print(f"Creating admin: {EMAIL}")

async def bootstrap():
    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with Session() as db:
        existing = await db.scalar(select(User).where(User.email == EMAIL))
        if existing:
            print(f"Admin already exists: {EMAIL}")
            return
        hashed = bcrypt.hashpw(PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.add(User(email=EMAIL, hashed_password=hashed, role=UserRole.admin, is_active=True))
        await db.commit()
        print(f"✅ Admin created! Email: {EMAIL} Password: {PASSWORD}")
    await engine.dispose()

asyncio.run(bootstrap())
