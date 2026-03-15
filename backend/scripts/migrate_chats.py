import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, DateTime, ForeignKey, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from app.database import SQLALCHEMY_DATABASE_URL

def create_table_if_not_exists(engine):
    with engine.connect() as conn:
        # Check if chat_sessions exists
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'"))
        if not result.fetchone():
            print("Creating chat_sessions table...")
            conn.execute(text("""
                CREATE TABLE chat_sessions (
                    id INTEGER NOT NULL PRIMARY KEY,
                    user_id INTEGER,
                    title VARCHAR NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users (id)
                )
            """))
            print("Creating index on chat_sessions...")
            conn.execute(text("CREATE INDEX ix_chat_sessions_id ON chat_sessions (id)"))
            # Try to add session_id to chat_history
            print("Adding session_id to chat_history...")
            try:
                conn.execute(text("ALTER TABLE chat_history ADD COLUMN session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE"))
            except Exception as e:
                print(f"Error alternating chat_history: {e}")
        else:
            print("chat_sessions table already exists.")
        
        # Migrate data
        # Find all distinct user_ids in chat_history where session_id is NULL
        result = conn.execute(text("SELECT DISTINCT user_id FROM chat_history WHERE session_id IS NULL"))
        users_with_legacy_chats = result.fetchall()
        
        for user_row in users_with_legacy_chats:
            u_id = user_row[0]
            if not u_id:
                continue
            
            # Create a legacy chat session
            print(f"Creating Legacy Chat format for user {u_id}")
            result = conn.execute(
                text("INSERT INTO chat_sessions (user_id, title) VALUES (:u_id, 'Старый чат') RETURNING id"),
                {"u_id": u_id}
            )
            sess_id = result.fetchone()[0]
            
            # Update chat_history
            conn.execute(
                text("UPDATE chat_history SET session_id = :sess_id WHERE user_id = :u_id AND session_id IS NULL"),
                {"sess_id": sess_id, "u_id": u_id}
            )
            
        conn.commit()

if __name__ == "__main__":
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    create_table_if_not_exists(engine)
    print("Migration completed successfully.")
