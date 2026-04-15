import sqlite3
import os

db_path = os.path.join('Databases', 'Shetkari Krushi Bhandar.db')
schema_path = os.path.join('Databases', 'schema.sql')
seed_path = os.path.join('Databases', 'seed_dev.sql')

# Remove empty database file if it exists
if os.path.exists(db_path) and os.path.getsize(db_path) == 0:
    os.remove(db_path)
    print(f"Removed empty database file: {db_path}")

# Create new database and apply schema
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

with open(schema_path, 'r', encoding='utf-8') as f:
    schema_sql = f.read()
    cursor.executescript(schema_sql)
    print("✓ Schema created successfully")

# Apply seed data
with open(seed_path, 'r', encoding='utf-8') as f:
    seed_sql = f.read()
    cursor.executescript(seed_sql)
    print("✓ Seed data inserted successfully")

# Verify
cursor.execute("SELECT COUNT(*) FROM Users")
user_count = cursor.fetchone()[0]
print(f"✓ Created {user_count} users")

cursor.execute("SELECT name, role FROM Users")
users = cursor.fetchall()
for name, role in users:
    print(f"  - {name} ({role})")

conn.close()
print("\nDatabase initialization complete!")
