import pyodbc

SERVER = '10.0.0.10'
USERNAME = 'knuñes'
PASSWORD = '123456'
DRIVER = '{ODBC Driver 17 for SQL Server}'

def connect(db):
    try:
        return pyodbc.connect(
            f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={db};UID={USERNAME};PWD={PASSWORD}"
        )
    except Exception as e:
        print("❌ Error conexión:", e)
        return None
