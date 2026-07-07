from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

connect_args: dict[str, str] = {}
if settings.db_schema:
    connect_args["options"] = f"-csearch_path={settings.db_schema}"

engine = create_async_engine(
    settings.database_url,
    connect_args=connect_args if connect_args else None,
    echo=settings.db_echo,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def get_transactional_session() -> AsyncIterator[AsyncSession]:
    """Session wrapped in a single transaction — rolled back on exception."""
    async with SessionLocal() as session:
        async with session.begin():
            yield session
