import pyodbc
import os  # Necesario para leer variables de entorno

SERVER = os.getenv('DB_SERVER', '10.0.0.10')
DRIVER = '{ODBC Driver 18 for SQL Server}'
USER = os.getenv('DB_USER')
PASSWORD = os.getenv('DB_PASSWORD')

def connect(db_name: str):
    try:
        if not USER:
            conn_str = (
                f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={db_name};"
                "Trusted_Connection=yes;TrustServerCertificate=yes;"
            )
        else:
            conn_str = (
                f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={db_name};"
                f"UID={USER};PWD={PASSWORD};TrustServerCertificate=yes;"
            )
        
        return pyodbc.connect(conn_str)
    except Exception as e:
        print(f"❌ Error de conexión a {db_name}: {e}")
        return None

# 🔴 NUEVA CONEXIÓN PARA EDAS
def get_edas_connection():
    return connect("EPI_BD_EDAS")

# 🔵 NUEVA CONEXIÓN PARA FEBRILES
def get_febriles_connection():
    return connect("EPI_BD_FEBRILES")

# 🔵 NUEVA CONEXIÓN PARA IRAS
def get_iras_connection():
    return connect("EPI_BD_IRAS")

# 🔵 NUEVA CONEXIÓN PARA TUBERCULOSIS
def get_TB_connection():
    return connect("EPI_BD_TUBERCULOSIS")

    # 🔵 NUEVA CONEXIÓN PARA DEPRESION
def get_depresion_connection():
    return connect("EPI_DB_SALUD_MENTAL")

    # 🔵 NUEVA CONEXIÓN PARA DEPRESION
def get_violencia_connection():
    return connect("EPI_BD_VIOLENCIA_FAMILIAR")

# 🔴 NUEVA CONEXIÓN PARA EDAS
def get_diabetes_connection():
    return connect("EPI_BD_DIABETES")

# 🔴 NUEVA CONEXIÓN PARA EDAS
def get_cancer_connection():
    return connect("EPI_BD_ENFERMEDADES_NO_TRANSMISIBLES")

# 🔴 NUEVA CONEXIÓN PARA EDAS
def get_renal_connection():
    return connect("EPI_BD_RENAL")

# 🔴 NUEVA CONEXIÓN PARA EDAS
def get_transito_connection():
    return connect("EPI_BD_ACCIDENTES_TRANSITO")

# 🔵 NUEVA CONEXIÓN PARA TUBERCULOSIS
def get_mortalidad_connection():
    return connect("EPI_BD_VIGILANCIA_EPIDEMIOLOGICA_DE_MORTALIDAD")
