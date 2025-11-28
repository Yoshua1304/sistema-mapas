import pyodbc

SERVER = '10.0.0.10'
USERNAME = 'knuñes'
PASSWORD = '123456'
DRIVER = '{ODBC Driver 17 for SQL Server}'

def connect(db_name: str):
    """Conecta a la base de datos indicada."""
    try:
        return pyodbc.connect(
            f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={db_name};UID={USERNAME};PWD={PASSWORD}"
        )
    except Exception as e:
        print(f"❌ Error de conexión a {db_name}:", e)
        return None


# 🔴 NUEVA CONEXIÓN PARA EDAS
def get_edas_connection():
    return connect("EPI_BD_EDAS")

# 🔵 NUEVA CONEXIÓN PARA FEBRILES
def get_febriles_connection():
    return connect("EPI_BD_FEBRILES")

# 🔵 NUEVA CONEXIÓN PARA FEBRILES
def get_iras_connection():
    return connect("EPI_BD_IRAS")

