#pip install flask pyodbc pandas flask-cors openpyxl
from flask import Flask, request, jsonify, send_file, make_response, send_from_directory
import pandas as pd
import os
import io
from flask_cors import CORS
from database import connect
from database import get_edas_connection,get_iras_connection, get_TB_connection, get_febriles_connection, get_depresion_connection,get_violencia_connection,get_diabetes_connection,get_cancer_connection,get_renal_connection,get_transito_connection,get_mortalidad_connection
from openpyxl import Workbook
app = Flask(__name__, static_folder='dist', static_url_path='/')

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

# CORS Global permisivo
CORS(app, supports_credentials=True)

@app.route("/exportar-datos", methods=["POST", "OPTIONS"])
def exportar_datos():

    # ===============================
    #   PRE-FLIGHT (CORS)
    # ===============================
    if request.method == "OPTIONS":
        response = make_response("", 200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return response

    data = request.get_json()
    distrito = data.get("distrito")
    diagnosticos = data.get("diagnosticos", [])

    print("📥 BACKEND → Distrito:", distrito)
    print("📥 BACKEND → Diagnósticos:", diagnosticos)

    if not distrito:
        return jsonify({"error": "No se recibió el distrito"}), 400

    # ======================================================
    #   1️⃣ POBLACIÓN
    # ======================================================
    try:
        conn_pob = connect("EPI_TABLAS_MAESTRO_2025")
        query_pob = """
            SELECT *
            FROM POBLACION_2026_DIRIS_LIMA_CENTRO
            WHERE UPPER(DISTRITO) = UPPER(?)
        """
        df_poblacion = pd.read_sql(query_pob, conn_pob, params=[distrito])
        conn_pob.close()

        if df_poblacion.empty:
            return jsonify({"error": "No se encontró población"}), 404

    except Exception as e:
        return jsonify({"error": f"Error población: {str(e)}"}), 500

    # ======================================================
    #   2️⃣ CONFIGURACIÓN DE DIAGNÓSTICOS
    # ======================================================
    COLUMNAS_PROHIBIDAS_TBC = [
        "Tipo de Documento", "Nro. Documento", "Nombre", "Apellidos",
        "F. de Nacimiento", "Nacionalidad", "Pais de Origen",
        "Pertenencia Etnica", "Otra Etnia", "Edad", "Genero",
        "Direccion Acutal", "Departamento", "Provincia"
    ]
    COLUMNAS_PROHIBIDAS_DIABETES = [
        "apepat", "apemat", "nombres", "sexo",
        "fecha_nac", "edad", "usuario",
        "ubigeo_res", "SEXO_2","dni"
    ]
    COLUMNAS_PROHIBIDAS_RENAL = [
        "nroDoc", "apellidoMaterno", "apellidoPaterno", "nombres",
        "nombreCompleto", "fechaNacimiento", "ubigeo","direccion"
    ]
    COLUMNAS_PROHIBIDAS_NOTIWEB_2025 = [
        "APEPAT", "APEMAT", "NOMBRES",
        "EDAD", "TIPO_EDAD", "SEXO",
        "DNI", "TIPO_DOC","LATITUD", "LONGITUD", "COORDENADAS", "UBICACION",
        "UBIGEO_DIR", "EESS_UBIGEO",
        "DIRECCION", "DIRECCION_COMPLETA",
        "TIPO_VIA", "NUM_PUERTA",
        "MANZANA", "BLOCK", "INTERIOR",
        "KILOMETRO", "LOTE", "REFERENCIA",
        "AGRUP_RURAL", "NOMBRE_AGRUP","coordenadas",
        "ETNIAPROC", "ETNIAS", "PROCEDE", "OTROPROC",
        "USUARIO", "FECHA_MOD", "USUARIO_MOD","LATITUD_UBIGEO","LONGITUD_UBIGEO","Ubicacion"
    ]
    COLUMNAS_PROHIBIDAS_MUERTE_MATERNA = [
        "apepat", "apemat", "nombres", "sexo",
        "hclinica", "edad", "usuario","fechamod"
        "cargo", "nombre_notificante","dni"
    ]

    COLUMNAS_PROHIBIDAS_MUERTE_MATERNA_EXTREMA = [
        "tipo_documento", "numero_documento", "paterno", "materno",
        "nombres", "edad", "historia_cli","medico_tratante"
        "medico_colegiatura", "responsable","cargo","profesion","profesion_otro",
        "usuario_reg_me","usuario_mod_me","usuario_reg_inv","usuario_mod_inv"
    ]

    COLUMNAS_PROHIBIDAS_MUERTE_FETAL_NEONATAL = [
        "ubigeo_res", "edadges", "ape_nom", "apepat","fecha_met","hora_mte","responsable","dni_madre",
        "apemat","nombres" ,"sexo", "fech_nac","hora_nac","latitud","longitud","usuario"
    ]

    COLUMNAS_PROHIBIDAS_DEPRESION = [
        "dni", "apepat", "apemat", "nombres", "hc",
        "telefono", "celular", "direccion",
        "tipo_doc", "f_nac",
        "ubigeo", "X",
        "idusucreo", "idusuaupdate", "idusuaupdate2",
        "fcreo", "fupdate",
        "fseg", "fseg2",
        "fseg_sistema", "fseg2_sistema"
    ]
    COLUMNAS_PROHIBIDAS_VIOLENCIA = [
        "codigo", "ape_pat", "ape_mat", "nom_1", "nom_2", "ide",
        "edad", "t_edad", "sexo",
        "ecivil", "gins",
        "ocupa", "distri",
        "domi", "apem_agres", "apep_agres",
        "nom_agres", "edadagre",
        "sexoagre", "vinculo",
        "queotrovin", "gradoins", "ocupacion","usuario", "ubigeo2","local"
    ]

    MAPEOS = {
        "Infecciones respiratorias agudas": {
            "conexion": get_iras_connection,
            "tabla": "REPORTE_IRA_2025",
            "campo_distrito": "[UBIGEO.1.distrito]",
            "campo_anio": "ano",
        },
        "Enfermedades diarreicas agudas": {
            "conexion": get_edas_connection,
            "tabla": "REPORTE_EDA_2025",
            "campo_distrito": "[UBIGEO.1.distrito]",
            "campo_anio": "ano",
        },
        "Febriles": {
            "conexion": get_febriles_connection,
            "tabla": "REPORTE_FEBRILES_2025",
            "campo_distrito": "[UBIGEO.1.distrito]",
            "campo_anio": "ano",
        },
        "TBC pulmonar": {
            "conexion": get_TB_connection,
            "tabla": "TB_BD_SIGTB",
            "campo_distrito": "[Distrito EESS]",
            "campo_anio": None,
            "columnas_prohibidas": COLUMNAS_PROHIBIDAS_TBC
        },
        "TBC TIA": {
            "conexion": get_TB_connection,
            "tabla": "TIA_TOTAL",
            "campo_distrito": "Distrito",
            "campo_anio": None
        },
        "TBC TIA EESS": {
            "conexion": get_TB_connection,
            "tabla": "TB_TIA_EESS_MINSA",
            "campo_distrito": "Distrito",
            "campo_anio": None
        },
        "Depresion": {
            "conexion": get_depresion_connection,
            "tabla": "Depresion",
            "campo_distrito": "Distrito",
            "campo_anio": "Año",
            "columnas_prohibidas": COLUMNAS_PROHIBIDAS_DEPRESION
        },
        "Violencia familiar": {
            "conexion": get_violencia_connection,
            "tabla": "VF_COMPLETO",
            "campo_distrito":"distrito_Agredido",
            "campo_anio":"ano",
            "columnas_prohibidas":COLUMNAS_PROHIBIDAS_VIOLENCIA
        },
        "Diabetes": {
            "conexion": get_diabetes_connection,
            "tabla": "REPORTE_DIABETES",
            "campo_distrito":"distrito",
            "campo_anio":"ano",
            "columnas_prohibidas":COLUMNAS_PROHIBIDAS_DIABETES
        },
         "Renal": {
            "conexion": get_renal_connection,
            "tabla": "BD_RENAL",
            "campo_distrito":"distrito",
            "campo_anio":"año",
            "columnas_prohibidas":COLUMNAS_PROHIBIDAS_RENAL
        },
         "Muerte materna": {
            "conexion": get_mortalidad_connection,
            "tabla": "MM_REPORTE_2024",
            "campo_distrito":"nom_ubigeo",
            "campo_anio":"ano",
            "columnas_prohibidas": COLUMNAS_PROHIBIDAS_MUERTE_MATERNA
        },
         "Muerte materna extrema": {
            "conexion": get_mortalidad_connection,
            "tabla": "MME_REPORTE_2024",
            "campo_distrito":"distrito",
            "campo_anio":"anio_not",
            "columnas_prohibidas": COLUMNAS_PROHIBIDAS_MUERTE_MATERNA_EXTREMA
        },
         "Muerte fetal neonatal": {
            "conexion": get_mortalidad_connection,
            "tabla": "MNP_REPORTE_2024",
            "campo_distrito":"distrito",
            "campo_anio":"anio",
            "columnas_prohibidas": COLUMNAS_PROHIBIDAS_MUERTE_FETAL_NEONATAL
        },
        "Cáncer": {
            "conexion": get_cancer_connection,
            "tablas": [
                {
                    "nombre": "CANCER_INFANTIL",
                    "tabla": "REPORTE_CANCER_INFANTIL",
                    "campo_distrito": "Distrito",
                    "campo_anio": "AÑO"
                },
                {
                    "nombre": "CANCER_ADULTO",
                    "tabla": "REPORTE_CANCER_ADULTO",
                    "campo_distrito": "Distrito",
                    "campo_anio": "AÑO"
                }
            ]
        }
    }

    # ======================================================
    #   3️⃣ CREAR EXCEL EN MEMORIA
    # ======================================================
    output = io.BytesIO()
    writer = pd.ExcelWriter(output, engine="openpyxl")

    df_poblacion.to_excel(writer, index=False, sheet_name="POBLACION")

    # ======================================================
    #   4️⃣ GENERAR HOJAS POR DIAGNÓSTICO
    # ======================================================
    for dx in diagnosticos:
        # =====================================
        # 🟣 CÁNCER (DOS TABLAS)
        # =====================================
        if dx == "Cáncer":
            info = MAPEOS["Cáncer"]

            for t in info["tablas"]:
                try:
                    print(f"📄 Hoja cáncer: {dx} - {t['nombre']}")
                    conn = info["conexion"]()

                    query = f"""
                        SELECT *
                        FROM {t['tabla']}
                        WHERE UPPER({t['campo_distrito']}) = UPPER(?)
                        AND {t['campo_anio']} = 2025
                    """

                    df_diag = pd.read_sql(query, conn, params=[distrito])
                    conn.close()

                    if df_diag.empty:
                        df_diag = pd.DataFrame({
                            "Mensaje": [f"Sin registros de {t['nombre']} en {distrito}"]
                        })

                except Exception as e:
                    df_diag = pd.DataFrame({"Error": [str(e)]})

                hoja = f"{dx}_{t['nombre']}"[:31]
                df_diag.to_excel(writer, index=False, sheet_name=hoja)

            continue  # 🔥 FUNDAMENTAL

        nombre_hoja = dx[:31]

        # ------------------ ESPECIALES ------------------
        if dx in MAPEOS:
            info = MAPEOS[dx]

            try:
                print(f"📄 Hoja especial: {dx}")
                conn = info["conexion"]()

                if info["campo_anio"]:
                    query = f"""
                        SELECT *
                        FROM {info['tabla']}
                        WHERE UPPER({info['campo_distrito']}) = UPPER(?)
                          AND {info['campo_anio']} = 2025
                    """
                else:
                    query = f"""
                        SELECT *
                        FROM {info['tabla']}
                        WHERE UPPER({info['campo_distrito']}) = UPPER(?)
                    """

                df_diag = pd.read_sql(query, conn, params=[distrito])
                conn.close()

                columnas_prohibidas = info.get("columnas_prohibidas", [])
                df_diag = df_diag.drop(
                    columns=[c for c in columnas_prohibidas if c in df_diag.columns],
                    errors="ignore"
                )

            except Exception as e:
                df_diag = pd.DataFrame({"Error": [str(e)]})

        # ------------------ NOTIWEB ------------------
        else:
            try:
                print(f"📄 Hoja NOTIWEB: {dx}")
                conn = connect("EPI_TABLAS_MAESTRO_2025")

                query = """
                    SELECT *
                    FROM NOTIWEB_2025
                    WHERE
                        UPPER(DIAGNOSTICO) = UPPER(?)
                        AND UPPER(DISTRITO) = UPPER(?)
                """

                # ✅ EJECUTAR CONSULTA
                df_diag = pd.read_sql(query, conn, params=[dx, distrito])
                conn.close()

                # 🔒 ELIMINAR COLUMNAS SENSIBLES
                df_diag = df_diag.drop(
                    columns=[c for c in COLUMNAS_PROHIBIDAS_NOTIWEB_2025 if c in df_diag.columns],
                    errors="ignore"
                )

            except Exception as e:
                df_diag = pd.DataFrame({"Error": [str(e)]})

        # ------------------ CONTROL FINAL ------------------
        if df_diag.empty:
            df_diag = pd.DataFrame({
                "Mensaje": [f"Sin registros de {dx} en {distrito}"]
            })

        hojas_existentes = writer.book.sheetnames
        original = nombre_hoja
        contador = 1

        while nombre_hoja in hojas_existentes:
            nombre_hoja = f"{original}_{contador}"[:31]
            contador += 1

        df_diag.to_excel(writer, index=False, sheet_name=nombre_hoja)

    writer.close()
    output.seek(0)

    # ======================================================
    #   5️⃣ RESPUESTA
    # ======================================================
    response = send_file(
        output,
        as_attachment=True,
        download_name=f"Datos_{distrito}.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

def get_febriles_por_distrito(distrito):
    conn = get_febriles_connection()
    if conn is None:
        return jsonify({"error": "No se pudo conectar a EPI_BD_FEBRILES"}), 500

    COLUMNAS_FEBRILES = ['feb_m1', 'feb_1_4', 'feb_5_9', 'feb_10_19', 'feb_20_59', 'feb_m60']

    sum_clause = " + ".join([f"[{col}]" for col in COLUMNAS_FEBRILES])

    sql = f"""
        SELECT
            {", ".join([f"SUM([{col}]) AS {col}" for col in COLUMNAS_FEBRILES])},
            SUM({sum_clause}) AS total_febriles
        FROM REPORTE_FEBRILES_2025
        WHERE ano = 2025
          AND [UBIGEO.1.distrito] = ?
          AND [UBIGEO.1.subregion] = 'DIRIS LIMA CENTRO'
    """

    cursor = conn.cursor()
    cursor.execute(sql, distrito.upper())
    row = cursor.fetchone()

    conn.close()

    if not row:
        return jsonify({
            "distrito": distrito,
            "total": 0,
            "detalle": []
        })

    column_names = [col[0] for col in cursor.description]
    data = dict(zip(column_names, row))

    detalle = [
        {"grupo_edad": col, "cantidad": int(data[col]) if data[col] else 0}
        for col in COLUMNAS_FEBRILES
    ]

    return jsonify({
        "distrito": distrito,
        "total": int(data["total_febriles"]),
        "detalle": detalle
    })

# ============================================================
# 1. ENDPOINT: POBLACIÓN POR DISTRITO
# ============================================================
@app.route("/api/poblacion")
def api_poblacion():
    distrito = request.args.get("distrito", "").strip()

    conn = connect("EPI_TABLAS_MAESTRO_2025")
    if conn is None:
        return jsonify({"error": "Error al conectar a BD"}), 500

    cursor = conn.cursor()

    sql = """
        SELECT
            SUM([MASCULINO] + [FEMENINO]) AS POBLACION_TOTAL,
            SUM([MASCULINO]) AS MASCULINO,
            SUM([FEMENINO]) AS FEMENINO,
            SUM([NIÑO]) AS NIÑO,
            SUM([Adolescente]) AS Adolescente,
            SUM([Joven]) AS Joven,
            SUM([Adulto]) AS Adulto,
            SUM([Adulto Mayor]) AS Adulto_Mayor
        FROM [POBLACION_2026_DIRIS_LIMA_CENTRO]
        WHERE UPPER([DISTRITO]) = UPPER(?)
    """

    try:
        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()

        if not row or row[0] is None:
            return jsonify({"error": f"Distrito '{distrito}' no encontrado"}), 404

        resultado = dict(zip([col[0] for col in cursor.description], row))
        resultado["distrito"] = distrito

        return jsonify(resultado)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

def get_depresion_por_distrito(distrito):
    conn = get_depresion_connection()
    if conn is None:
        return jsonify({"error": "Error conexión salud mental"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                COUNT(*) AS total
            FROM Depresion
            WHERE
                UPPER(Distrito) = UPPER(?)
                AND [Año] = 2025
        """

        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()

        total = row[0] if row else 0

        return jsonify({
            "distrito": distrito,
            "enfermedad": "Depresion",
            "total": total,
            "detalle": [
                {"tipo_dx": "DEPRESION", "cantidad": total}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

def get_violencia_por_distrito(distrito):
    conn = get_violencia_connection()
    if conn is None:
        return jsonify({"error": "Error conexión salud mental"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                COUNT(*) AS total
            FROM VF_Completo
            WHERE
                UPPER(distrito_Agredido) = UPPER(?)
                AND [ano] = 2025
        """

        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()

        total = row[0] if row else 0

        return jsonify({
            "distrito": distrito,
            "enfermedad": "Violencia",
            "total": total,
            "detalle": [
                {"tipo_dx": "Violencia", "cantidad": total}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

def get_diabetes_por_distrito(distrito):
    conn = get_diabetes_connection()
    if conn is None:
        return jsonify({"error": "Error conexión Diabetes"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                COUNT(*) AS total
            FROM REPORTE_DIABETES
            WHERE
                UPPER(distrito) = UPPER(?)
                AND [ano] = 2025
        """

        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()

        total = row[0] if row else 0

        return jsonify({
            "distrito": distrito,
            "enfermedad": "Diabetes",
            "total": total,
            "detalle": [
                {"tipo_dx": "Diabetes", "cantidad": total}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

def get_cancer_por_distrito(distrito):
    conn = get_cancer_connection()
    if conn is None:
        return jsonify({"error": "Error conexión CÁNCER"}), 500

    try:
        cursor = conn.cursor()

        query = """
            SELECT
                SUM(CASE WHEN origen = 'ADULTO' THEN total ELSE 0 END) AS CANCER_ADULTO,
                SUM(CASE WHEN origen = 'INFANTIL' THEN total ELSE 0 END) AS CANCER_INFANTIL
            FROM (
                SELECT
                    'ADULTO' AS origen,
                    COUNT(*) AS total
                FROM REPORTE_CANCER_ADULTO
                WHERE Año = 2025
                  AND UPPER(Distrito) = UPPER(?)

                UNION ALL

                SELECT
                    'INFANTIL' AS origen,
                    COUNT(*) AS total
                FROM REPORTE_CANCER_INFANTIL
                WHERE Año = 2025
                  AND UPPER(Distrito) = UPPER(?)
            ) t
        """

        cursor.execute(query, (distrito, distrito))
        row = cursor.fetchone()

        cancer_adulto = int(row.CANCER_ADULTO) if row and row.CANCER_ADULTO else 0
        cancer_infantil = int(row.CANCER_INFANTIL) if row and row.CANCER_INFANTIL else 0

        total = cancer_adulto + cancer_infantil

        return jsonify({
            "distrito": distrito,
            "total": total,
            "detalle": [
                {
                    "tipo_dx": "CANCER ADULTO",
                    "cantidad": cancer_adulto
                },
                {
                    "tipo_dx": "CANCER INFANTIL",
                    "cantidad": cancer_infantil
                }
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
  
def get_renal_por_distrito(distrito):
    conn = get_renal_connection()
    if conn is None:
        return jsonify({"error": "Error conexión Diabetes"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                COUNT(*) AS total
            FROM BD_RENAL
            WHERE
                UPPER(distrito) = UPPER(?)
                AND [año] = 2025
        """

        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()

        total = row[0] if row else 0

        return jsonify({
            "distrito": distrito,
            "enfermedad": "renal",
            "total": total,
            "detalle": [
                {"tipo_dx": "Renal", "cantidad": total}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

def get_transito_por_distrito(distrito):
    conn = get_transito_connection()
    if conn is None:
        return jsonify({"error": "Error conexión Diabetes"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                COUNT(*) AS total
            FROM REPORTE_ACCIDENTES_TRANSITO
            WHERE
                UPPER(DISTRITO) = UPPER(?)
                AND [ANO] = 2025
        """

        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()

        total = row[0] if row else 0

        return jsonify({
            "distrito": distrito,
            "enfermedad": "Transito",
            "total": total,
            "detalle": [
                {"tipo_dx": "Transito", "cantidad": total}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

def get_mortalidad_materna_por_distrito(distrito):
    conn = get_mortalidad_connection()
    if conn is None:
        return jsonify({"error": "Error conexión Mortalidad Materna"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT COUNT(*) AS total
            FROM MM_REPORTE_2024
            WHERE
                LTRIM(RTRIM(nom_ubigeo)) COLLATE Latin1_General_CI_AI
                = LTRIM(RTRIM(?)) COLLATE Latin1_General_CI_AI
                AND [ano] = 2025
        """

        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()
        total = row[0] if row else 0

        return jsonify({
            "nom_ubigeo": distrito,
            "enfermedad": "mortalidad_materna",
            "total": total,
            "detalle": [
                {"tipo_dx": "mortalidad_materna", "cantidad": total}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

def get_mortalidad_extrema_por_distrito(distrito):
    conn = get_mortalidad_connection()
    if conn is None:
        return jsonify({"error": "Error conexión Diabetes"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                COUNT(*) AS total
            FROM MME_REPORTE_2024
            WHERE
                UPPER(distrito) = UPPER(?)
                AND [anio_not] = 2025
        """

        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()

        total = row[0] if row else 0

        return jsonify({
            "distrito": distrito,
            "enfermedad": "mortalidad_materna",
            "total": total,
            "detalle": [
                {"tipo_dx": "mortalidad_materna", "cantidad": total}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

def get_mortalidad_neonatal_por_distrito(distrito):
    conn = get_mortalidad_connection()
    if conn is None:
        return jsonify({"error": "Error conexión Diabetes"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                COUNT(*) AS total
            FROM MNP_REPORTE_2024
            WHERE
                UPPER(distrito) = UPPER(?)
                AND [anio] = 2025
        """

        cursor.execute(sql, (distrito,))
        row = cursor.fetchone()

        total = row[0] if row else 0

        return jsonify({
            "distrito": distrito,
            "enfermedad": "mortalidad_neonatal_perinatal",
            "total": total,
            "detalle": [
                {"tipo_dx": "mortalidad_neonatal_perinatal", "cantidad": total}
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# ============================================================
# 2. ENDPOINT: CASOS POR ENFERMEDAD
# ============================================================
@app.route("/api/casos_enfermedad")
def casos_enfermedad():
    distrito = request.args.get('distrito')
    enfermedad = request.args.get('enfermedad')

    if not distrito or not enfermedad:
        return jsonify({"error": "Faltan parámetros"}), 400

    # -------------------------------------------
    # 🔴 EDAS
    # -------------------------------------------
    if enfermedad.upper() in [
        "ENFERMEDADES DIARREICAS AGUDAS",
        "EDAS",
        "EDA",
        "DIAGNOSTICO-EDAS"
    ]:
        return get_edas_por_distrito(distrito)

    # -------------------------------------------
    # 🔵 FEBRILES
    # -------------------------------------------
    if enfermedad.upper() in [
        "FEBRILES",
        "DIAGNOSTICO-FEBRILES"
    ]:
        return get_febriles_por_distrito(distrito)
    
    # -------------------------------------------
    # 🔵 FEBRILES
    # -------------------------------------------

    if enfermedad.upper() in [
        "INFECCIONES RESPIRATORIAS AGUDAS",
        "IRA",
        "IRAS",
        "DIAGNOSTICO-IRAS"
    ]:
        return get_iras_por_distrito(distrito)
    # -------------------------------------------
    # 🔵 TUBERCULOSIS_TIA
    # -------------------------------------------

    if enfermedad.upper() in [
        "TBC-TIA",
        "TBC TIA",
        "TBC",
        "TIA",
        "DIAGNOSTICO-TBC-TIA",
        "diagnostico-tbcTIA"
    ]:
        return get_tia_total_por_distrito(distrito)
    # -------------------------------------------
    # 🔵 TUBERCULOSIS_TIA_EESS
    # -------------------------------------------

    if enfermedad.upper() in [
        "TBC TIA EESS",
        "DIAGNOSTICO-TBC-TIAEESS",
        "DIAGNOSTICO-TBCTIAEESS"
    ]:
        return get_tia_total_por_distrito_EESS(distrito)
    
    # -------------------------------------------
    # 🔵 TUBERCULOSIS
    # -------------------------------------------

    if enfermedad.upper() in [
        "TBC PULMONAR",
        "DIAGNOSTICO-TBC-PULMONAR",
        "DIAGNOSTICO-TBCPULMONAR"
    ]:
        return tb_sigtb_distritos(distrito)
    
    # -------------------------------------------
    # 🟣 DEPRESIÓN
    # -------------------------------------------
    if enfermedad.upper() in [
        "DEPRESION",
        "DEPRESIÓN",
        "DIAGNOSTICO-DEPRESION",
        "DIAGNOSTICO-DEPRESIÓN"
    ]:
        return get_depresion_por_distrito(distrito)
    
     # -------------------------------------------
    # 🟣 VIOLENCIA
    # -------------------------------------------
    if enfermedad.upper() in [
        "VIOLENCIA",
        "VIOLENCIA FAMILIAR",
        "VIOLENCIAFAMILIAR",
        "DIAGNOSTICO-VIOLENCIA",
        "DIAGNOSTICO-VIOLENCIA-FAMILIAR"
    ]:
        return get_violencia_por_distrito(distrito)
    
    # -------------------------------------------
    # 🟣 DIABETES
    # -------------------------------------------
    if enfermedad.upper() in [
        "DIABETES",
        "DIAGNOSTICO-DIABETES",
    ]:
        return get_diabetes_por_distrito(distrito)

    # -------------------------------------------
    # 🟤 CÁNCER TOTAL
    # -------------------------------------------
    if enfermedad.upper() in [
        "CANCER",
        "CÁNCER",
        "CANCER TOTAL",
        "DIAGNOSTICO-CANCER",
        "DIAGNOSTICO-CANCER-TOTAL"
    ]:
        return get_cancer_por_distrito(distrito)

    # -------------------------------------------
    # 🟣 RENAL
    # -------------------------------------------
    if enfermedad.upper() in [
        "RENAL",
        "DIAGNOSTICO-RENAL",
    ]:
        return get_renal_por_distrito(distrito)

    # -------------------------------------------
    # 🟣 TRANSITO
    # -------------------------------------------
    if enfermedad.upper() in [
        "ACCIDENTE TRANSITO",
        "DIAGNOSTICO-ACCIDENTE-TRANSITO",
        "TRANSITO",
        "DIAGNOSTICO-TRANSITO",
    ]:
        return get_transito_por_distrito(distrito)
    
    # -------------------------------------------
    # 🟣 MUERTE MATERNA
    # -------------------------------------------
    if enfermedad.upper() in [
        "MUERTE MATERNA",
        "DIAGNOSTICO-MUERTE-MATERNA",
        "MATERNA",
        "DIAGNOSTICO-MATERNA",
    ]:
        return get_mortalidad_materna_por_distrito(distrito)

    # -------------------------------------------
    # 🟣 MUERTE MATERNA EXTREMA
    # -------------------------------------------
    if enfermedad.upper() in [
        "MUERTE MATERNA EXTREMA",
        "DIAGNOSTICO-MUERTE-MATERNA-EXTREMA",
        "MATERNA EXTREMA",
        "DIAGNOSTICO-MATERNA-EXTREMA",
    ]:
        return get_mortalidad_extrema_por_distrito(distrito)
    
    # -------------------------------------------
    # 🟣 MUERTE PERINATAL NEONATAL
    # -------------------------------------------
    if enfermedad.upper() in [
        "MUERTE FETAL NEONATAL",
        "DIAGNOSTICO-MUERTE-FETAL-NEONATAL",
        "FETAL-NEONATAL",
        "DIAGNOSTICO-FETAL-NEONATAL",
    ]:
        return get_mortalidad_neonatal_por_distrito(distrito)


    # -------------------------------------------
    # 🟢 NOTIWEB (normal)
    # -------------------------------------------
    conn = connect("EPI_TABLAS_MAESTRO_2025")
    if conn is None:
        return jsonify({"error": "Error de conexión"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                [TIPO_DX],
                COUNT(*) AS Cantidad
            FROM [NOTIWEB_2025]
            WHERE UPPER([distrito]) = UPPER(?)
              AND UPPER([DIAGNOSTICO]) = UPPER(?)
              AND [subregion] = 'DIRIS LIMA CENTRO'
            GROUP BY [TIPO_DX]
            ORDER BY Cantidad DESC
        """

        cursor.execute(sql, (distrito, enfermedad))
        rows = cursor.fetchall()

        total = sum(r[1] for r in rows)

        return jsonify({
            "distrito": distrito,
            "enfermedad": enfermedad,
            "total": total,
            "detalle": [
                {"tipo_dx": r[0], "cantidad": r[1]}
                for r in rows
            ]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

# ============================================================
# 3. ENDPOINT: CASOS TOTALES (REPARADO)
# ============================================================
@app.route('/api/casos_totales', methods=['GET'])
def casos_totales():
    distrito = request.args.get('distrito')
    if not distrito:
        return jsonify({"error": "Falta el distrito"}), 400

    conn = connect("EPI_TABLAS_MAESTRO_2025")
    if conn is None:
        return jsonify({"error": "Error al conectar a BD"}), 500

    cursor = conn.cursor()

    query = """
        SELECT COUNT(*) 
        FROM NOTIWEB_2025
        WHERE UPPER(distrito) = UPPER(?)
    """

    cursor.execute(query, (distrito,))
    total = cursor.fetchone()[0]

    conn.close()

    return jsonify({"total": total})

@app.route('/api/enfermedades')
def enfermedades():
    conn = connect("EPI_TABLAS_MAESTRO_2025")
    if conn is None:
        return jsonify({"error": "Error al conectar a BD"}), 500

    try:
        cursor = conn.cursor()
        sql = """
            SELECT DISTINCT UPPER(DIAGNOSTICO)
            FROM NOTIWEB_2025
            WHERE DIAGNOSTICO IS NOT NULL
            ORDER BY 1
        """
        cursor.execute(sql)
        enfermedades = [row[0] for row in cursor.fetchall()]

        return jsonify({"enfermedades": enfermedades})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route("/api/casos_por_distrito")
def casos_por_distrito():
    enfermedad = request.args.get("enfermedad")

    if not enfermedad:
        return jsonify({"error": "Falta parámetro 'enfermedad'"}), 400

    conn = connect("EPI_TABLAS_MAESTRO_2025")
    if conn is None:
        return jsonify({"error": "Error de conexión"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT
                UPPER(distrito) AS distrito,
                COUNT(*) AS casos
            FROM NOTIWEB_2025
            WHERE UPPER(DIAGNOSTICO) = UPPER(?)
              AND subregion = 'DIRIS LIMA CENTRO'
            GROUP BY distrito
        """

        cursor.execute(sql, (enfermedad,))
        rows = cursor.fetchall()

        resultado = {row[0]: row[1] for row in rows}

        return jsonify(resultado)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route("/casos-diagnostico", methods=["GET"])
def casos_diagnostico():
    diagnostico = request.args.get("diagnostico")

    if not diagnostico:
        return jsonify({"error": "Falta parámetro 'diagnostico'"}), 400

    conn = connect("EPI_TABLAS_MAESTRO_2025")
    if conn is None:
        return jsonify({"error": "Error de conexión"}), 500

    cursor = conn.cursor()

    query = """
        SELECT COUNT(*) 
        FROM NOTIWEB_2025
        WHERE UPPER(DIAGNOSTICO) = UPPER(?)
    """
    cursor.execute(query, (diagnostico,))
    total = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return jsonify({"diagnostico": diagnostico, "total": total})

@app.route("/api/casos_por_diagnostico")
def api_casos_por_diagnostico():
    diagnostico = request.args.get("diagnostico")

    if not diagnostico:
        return jsonify({"error": "Falta parámetro 'diagnostico'"}), 400

    conn = connect("EPI_TABLAS_MAESTRO_2025")
    if conn is None:
        return jsonify({"error": "Error al conectar a BD"}), 500

    try:
        cursor = conn.cursor()

        sql = """
            SELECT 
                UPPER(distrito) AS distrito,
                COUNT(*) AS cantidad
            FROM NOTIWEB_2025
            WHERE UPPER(DIAGNOSTICO) = UPPER(?)
              AND subregion = 'DIRIS LIMA CENTRO'
            GROUP BY distrito
            ORDER BY cantidad DESC
        """

        cursor.execute(sql, (diagnostico,))
        rows = cursor.fetchall()

        # Total de casos
        total = sum([r[1] for r in rows])

        # Desglose por distrito
        detalle = [
            {"distrito": r[0], "cantidad": r[1]}
            for r in rows
        ]

        return jsonify({
            "diagnostico": diagnostico,
            "total": total,
            "detalle": detalle
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ============================================================
# 4. ENDPOINT: CASOS EDAS POR DISTRITO (EPI_BD_EDAS)
# ============================================================

COLUMNAS_EDA = [
    'DAA_C1', 'DAA_C1_4', 'DAA_C5', 'DAA_C5_11', 'DAA_C12_17', 'DAA_C18_29', 'DAA_C30_59', 'DAA_C60',
    'DIS_C1', 'DIS_C1_4', 'DIS_C5', 'DIS_C5_11', 'DIS_C12_17', 'DIS_C18_29', 'DIS_C30_59', 'DIS_C60'
]

@app.route("/api/edas_por_distrito", methods=["GET"])
def api_edas_por_distrito():
    distrito = request.args.get("distrito", "").upper()

    if not distrito:
        return jsonify({"error": "Falta parámetro 'distrito'"}), 400

    conn = get_edas_connection()
    if conn is None:
        return jsonify({"error": "No se pudo conectar a EPI_BD_EDAS"}), 500

    total_sum_clause = " + ".join([f"[{col}]" for col in COLUMNAS_EDA])

    query = f"""
        SELECT SUM({total_sum_clause}) AS Total_EDAs
        FROM REPORTE_EDA_2025
        WHERE ano = 2025 AND [UBIGEO.1.distrito] = ?
    """

    cursor = conn.cursor()
    cursor.execute(query, distrito)
    row = cursor.fetchone()

    total_edas = int(row[0]) if row and row[0] is not None else 0

    conn.close()

    return jsonify({
        "distrito": distrito,
        "total_edas": total_edas
    })

@app.get("/api/edas/<distrito>")
def get_edas_por_distrito(distrito):
    conn = get_edas_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500

    COLUMNAS_DAA = ['DAA_C1', 'DAA_C1_4', 'DAA_C5', 'DAA_C5_11', 'DAA_C12_17', 'DAA_C18_29', 'DAA_C30_59', 'DAA_C60']
    COLUMNAS_DIS = ['DIS_C1', 'DIS_C1_4', 'DIS_C5', 'DIS_C5_11', 'DIS_C12_17', 'DIS_C18_29', 'DIS_C30_59', 'DIS_C60']

    sum_daa = " + ".join([f"[{c}]" for c in COLUMNAS_DAA])
    sum_dis = " + ".join([f"[{c}]" for c in COLUMNAS_DIS])

    sql = f"""
        SELECT 
            SUM({sum_daa}) AS total_daa,
            SUM({sum_dis}) AS total_dis
        FROM REPORTE_EDA_2025
        WHERE ano = 2025 AND [UBIGEO.1.distrito] = ?
    """

    cursor = conn.cursor()
    cursor.execute(sql, distrito.upper())
    row = cursor.fetchone()

    daa = int(row[0]) if row and row[0] else 0
    dis = int(row[1]) if row and row[1] else 0

    return jsonify({
        "daa": daa,
        "dis": dis,
        "total": daa + dis
    })

# ============================================================
# ENDPOINT: CASOS FEBRILES POR DISTRITO
# ============================================================
@app.route("/api/febriles_distrito")
def febriles_distrito():
    distrito = request.args.get('distrito')

    if not distrito:
        return jsonify({"error": "Falta el parámetro 'distrito'"}), 400

    conn = get_febriles_connection()
    if conn is None:
        return jsonify({"error": "Error de conexión a EPI_BD_FEBRILES"}), 500

    COLUMNAS_FEBRILES = ['feb_m1', 'feb_1_4', 'feb_5_9', 'feb_10_19', 'feb_20_59', 'feb_m60']

    select_columns = [f"SUM([{col}]) AS {col}" for col in COLUMNAS_FEBRILES]
    select_columns_str = ", ".join(select_columns)

    total_sum_clause = " + ".join([f"[{col}]" for col in COLUMNAS_FEBRILES])

    try:
        cursor = conn.cursor()

        sql = f"""
            SELECT
                {select_columns_str},
                SUM({total_sum_clause}) AS Total_Febriles
            FROM [REPORTE_FEBRILES_2025]
            WHERE 
                [UBIGEO.1.distrito] = ?
                AND [UBIGEO.1.subregion] = 'DIRIS LIMA CENTRO'
                AND ano = 2025
        """

        cursor.execute(sql, distrito.upper())
        row = cursor.fetchone()

        if not row or row[0] is None:
            return jsonify({
                "distrito": distrito,
                "total": 0,
                "detalle": [],
                "mensaje": f"No hay registros de febriles en {distrito}"
            })

        # Convertir a diccionario
        column_names = [col[0] for col in cursor.description]
        data = dict(zip(column_names, row))

        total_febriles = int(data['Total_Febriles'])

        # Convertir desglose
        detalle = [
            {"grupo_edad": col, "cantidad": int(data[col]) if data[col] is not None else 0}
            for col in COLUMNAS_FEBRILES
        ]

        return jsonify({
            "distrito": distrito,
            "total": total_febriles,
            "detalle": detalle
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

@app.route("/api/iras_distrito")
def api_iras_distrito():
    distrito = request.args.get("distrito")
    if not distrito:
        return jsonify({"error": "Falta distrito"}), 400

    conn = get_iras_connection()
    if not conn:
        return jsonify({"error": "No se pudo conectar a EPI_BD_IRAS"}), 500

    try:
        cursor = conn.cursor()

        # Usar SUM([col]) + SUM([col2]) ... para mayor robustez y escapar columnas con corchetes
        query = """
            SELECT
                (COALESCE(SUM([IRA_M2]),0) + COALESCE(SUM([IRA_2_11]),0) + COALESCE(SUM([IRA_1_4A]),0)) AS IRA_NO_NEUMONIA,
                (COALESCE(SUM([SOB_2A]),0) + COALESCE(SUM([SOB_2_4A]),0)) AS SOB_ASMA,
                (COALESCE(SUM([NGR_M2]),0) + COALESCE(SUM([NGR_2_11]),0) + COALESCE(SUM([NGR_1_4A]),0)) AS NEUMONIA_GRAVE,
                (COALESCE(SUM([NEU_2_11]),0) + COALESCE(SUM([NEU_1_4A]),0) + COALESCE(SUM([NEU_5_9A]),0) + COALESCE(SUM([NEU_10_19]),0) + COALESCE(SUM([NEU_20_59]),0) + COALESCE(SUM([NEU_60A]),0)) AS NEUMONIA
            FROM REPORTE_IRA_2025
            WHERE UPPER([UBIGEO.1.distrito]) = UPPER(?)
        """

        cursor.execute(query, (distrito,))
        row = cursor.fetchone()

        ira_no_neumonia = row.IRA_NO_NEUMONIA if row and row.IRA_NO_NEUMONIA is not None else 0
        sob_asma = row.SOB_ASMA if row and row.SOB_ASMA is not None else 0
        neumonia_grave = row.NEUMONIA_GRAVE if row and row.NEUMONIA_GRAVE is not None else 0
        neumonia = row.NEUMONIA if row and row.NEUMONIA is not None else 0

        total = ira_no_neumonia + sob_asma + neumonia_grave + neumonia

        return jsonify({
            "distrito": distrito,
            "ira_no_neumonia": int(ira_no_neumonia),
            "sob_asma": int(sob_asma),
            "neumonia_grave": int(neumonia_grave),
            "neumonia": int(neumonia),
            "total": int(total)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/iras/<distrito>")
def get_iras_por_distrito(distrito):
    conn = get_iras_connection()
    if not conn:
        return jsonify({"error": "No se pudo conectar a EPI_BD_IRAS"}), 500

    try:
        cursor = conn.cursor()

        query = """
            SELECT 
                COALESCE(SUM([IRA_M2]),0)      AS IRA_M2,
                COALESCE(SUM([IRA_2_11]),0)    AS IRA_2_11,
                COALESCE(SUM([IRA_1_4A]),0)    AS IRA_1_4A,

                COALESCE(SUM([SOB_2A]),0)      AS SOB_2A,
                COALESCE(SUM([SOB_2_4A]),0)    AS SOB_2_4A,

                COALESCE(SUM([NGR_M2]),0)      AS NGR_M2,
                COALESCE(SUM([NGR_2_11]),0)    AS NGR_2_11,
                COALESCE(SUM([NGR_1_4A]),0)    AS NGR_1_4A,

                COALESCE(SUM([NEU_2_11]),0)    AS NEU_2_11,
                COALESCE(SUM([NEU_1_4A]),0)    AS NEU_1_4A,
                COALESCE(SUM([NEU_5_9A]),0)    AS NEU_5_9A,
                COALESCE(SUM([NEU_10_19]),0)   AS NEU_10_19,
                COALESCE(SUM([NEU_20_59]),0)   AS NEU_20_59,
                COALESCE(SUM([NEU_60A]),0)     AS NEU_60A
            FROM REPORTE_IRA_2025
            WHERE UPPER([UBIGEO.1.distrito]) = UPPER(?)
        """

        cursor.execute(query, (distrito,))
        row = cursor.fetchone()

        if not row:
            return jsonify({
                "distrito": distrito,
                "total": 0,
                "detalle": []
            })

        ira_no_neumonia = int(row.IRA_M2) + int(row.IRA_2_11) + int(row.IRA_1_4A)
        sob_asma = int(row.SOB_2A) + int(row.SOB_2_4A)
        neumonia_grave = int(row.NGR_M2) + int(row.NGR_2_11) + int(row.NGR_1_4A)
        neumonia = (
            int(row.NEU_2_11) + int(row.NEU_1_4A) + int(row.NEU_5_9A) +
            int(row.NEU_10_19) + int(row.NEU_20_59) + int(row.NEU_60A)
        )

        total = ira_no_neumonia + sob_asma + neumonia_grave + neumonia

        return jsonify({
            "distrito": distrito,
            "total": total,

            # 🔹 CAMPOS PLANOS (LO QUE EL POPUP USA)
            "ira_no_neumonia": ira_no_neumonia,
            "sob_asma": sob_asma,
            "neumonia_grave": neumonia_grave,
            "neumonia": neumonia,

            # 🔹 DETALLE (OPCIONAL / FUTURO)
            "detalle": [
                {"tipo_dx": "IRA NO NEUMONIA", "cantidad": ira_no_neumonia},
                {"tipo_dx": "SOB / ASMA", "cantidad": sob_asma},
                {"tipo_dx": "NEUMONIA GRAVE", "cantidad": neumonia_grave},
                {"tipo_dx": "NEUMONIA", "cantidad": neumonia},
            ]
        })


    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ============================================================
# ENDPOINT: TABLA COMPLETA TIA_TOTAL (TUBERCULOSIS)
# ============================================================

def get_tia_total_por_distrito(distrito):
    conn = get_TB_connection()
    if conn is None:
        return jsonify({"error": "Error en la conexión TB"}), 500

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM TIA_TOTAL")
    rows = cursor.fetchall()
    conn.close()

    # Convertir estructura
    data = [
        {
            "Distrito_EESS": r[0],
            "casos": r[1],
            "poblacion_total": r[2],
            "TIA_100k": float(r[3]),
            "Distrito": r[4]
        }
        for r in rows
    ]

    # Buscar distrito
    for row in data:
        if row["Distrito"].upper() == distrito.upper():
            return jsonify({
                "distrito": distrito,
                "enfermedad": "TBC TIA",
                "total": row["casos"],
                "detalle": [],
                "TIA_100k": row["TIA_100k"]
            })

    # Si no existe el distrito
    return jsonify({
        "distrito": distrito,
        "enfermedad": "TBC TIA",
        "total": 0,
        "detalle": [],
        "TIA_100k": 0
    })

@app.route("/tb_tia_total")
def tb_tia_total():
    return jsonify(get_tia_total_por_distrito())

# ============================================================
# ENDPOINT: TABLA COMPLETA TIA_TOTAL_EESS (TUBERCULOSIS)
# ============================================================

def get_tia_total_por_distrito_EESS(distrito):
    conn = get_TB_connection()
    if conn is None:
        return jsonify({"error": "Error en la conexión TB"}), 500

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM TB_TIA_EESS_MINSA")
    rows = cursor.fetchall()
    conn.close()

    data = [
        {
            "Distrito_EESS": r[0],
            "casos": r[1],
            "poblacion_total": r[2],
            "TIA_100k": float(r[3]),
            "Distrito": r[4]
        }
        for r in rows
    ]

    # Buscar distrito
    for row in data:
        if row["Distrito"].upper() == distrito.upper():
            return jsonify({
                "distrito": distrito,
                "enfermedad": "TBC TIA",
                "total": row["casos"],
                "detalle": [],
                "TIA_100k": row["TIA_100k"]
            })

    # Si no existe
    return jsonify({
        "distrito": distrito,
        "enfermedad": "TBC TIA",
        "total": 0,
        "detalle": [],
        "TIA_100k": 0
    })

@app.route("/tb_tia_total_EESS_all")
def tb_tia_total_EESS_all():
    conn = get_TB_connection()
    if conn is None:
        return jsonify({"error": "Error en la conexión TB"}), 500

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM TB_TIA_EESS_MINSA")
    rows = cursor.fetchall()
    conn.close()

    data = [
        {
            "Distrito_EESS": r[0],
            "casos": r[1],
            "poblacion_total": r[2],
            "TIA_100k": float(r[3]),
            "Distrito": r[4]
        }
        for r in rows
    ]

    return jsonify(data)

@app.route("/tb_tia_total_EESS")
def tb_tia_total_EESS():
    distrito = request.args.get("distrito")
    if not distrito:
        return jsonify({"error": "Debe enviar ?distrito=nombre"}), 400

    return get_tia_total_por_distrito_EESS(distrito)

# ============================================================
# ENDPOINT: CASOS TUBERCULOSIS SIGTB POR DISTRITO
# ============================================================
def tb_sigtb_distritos(distrito):
    try:
        conn = get_TB_connection()
        if conn is None:
            return jsonify({"error": "Error en la conexión TB"}), 500

        cursor = conn.cursor()

        sql = """
        SELECT COUNT(*) AS total
        FROM TB_BD_SIGTB
        WHERE LTRIM(RTRIM(UPPER([Distrito EESS]))) = LTRIM(RTRIM(UPPER(?)))
        """

        cursor.execute(sql, distrito)
        row = cursor.fetchone()
        conn.close()
 
        total = row[0] if row else 0

        return jsonify({
            "distrito": distrito,
            "enfermedad": "TBC PULMONAR",
            "total": total,
            "detalle": []
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# ============================================================
# ENDPOINTS PARA ESTABLECIMIENTOS
# ============================================================

@app.route("/api/casos_totales_establecimiento", methods=["GET"])
def api_casos_totales_establecimiento():
    establecimiento = request.args.get("establecimiento", "").strip()
    
    if not establecimiento:
        return jsonify({"error": "Falta parámetro 'establecimiento'"}), 400
    
    # Para NOTIWEB_2025 - asumiendo columna 'ESTABLECIMIENTO'
    try:
        conn = connect("EPI_TABLAS_MAESTRO_2025")
        if conn is None:
            return jsonify({"error": "Error de conexión"}), 500
        
        cursor = conn.cursor()
        
        # Buscar en NOTIWEB_2025
        sql = """
            SELECT COUNT(*) 
            FROM NOTIWEB_2025
            WHERE UPPER(ESTABLECIMIENTO) = UPPER(?)
               OR UPPER([NOMBRE EESS]) = UPPER(?)
               OR UPPER([EESS]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento, establecimiento))
        row = cursor.fetchone()
        total = row[0] if row else 0
        
        conn.close()
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/poblacion_establecimiento", methods=["GET"])
def api_poblacion_establecimiento():
    establecimiento = request.args.get("establecimiento", "").strip()
    
    if not establecimiento:
        return jsonify({"error": "Falta parámetro 'establecimiento'"}), 400
    
    # En tu base de datos actual, probablemente no haya población por establecimiento
    # Por ahora devolvemos null
    return jsonify({
        "establecimiento": establecimiento,
        "mensaje": "No hay datos de población por establecimiento en la base de datos actual"
    })

@app.route("/api/casos_enfermedad_establecimiento", methods=["GET"])
def api_casos_enfermedad_establecimiento():
    establecimiento = request.args.get("establecimiento", "").strip()
    enfermedad = request.args.get("enfermedad", "").strip()
    
    if not establecimiento or not enfermedad:
        return jsonify({"error": "Faltan parámetros 'establecimiento' o 'enfermedad'"}), 400
    
    enfermedad_upper = enfermedad.upper()
    
    # 🔴 EDAS
    if enfermedad_upper in ["ENFERMEDADES DIARREICAS AGUDAS", "EDAS", "EDA"]:
        return get_edas_por_establecimiento(establecimiento)
    
    # 🔵 FEBRILES
    if enfermedad_upper in ["FEBRILES"]:
        return get_febriles_por_establecimiento(establecimiento)
    
    # 🔵 IRAS
    if enfermedad_upper in ["INFECCIONES RESPIRATORIAS AGUDAS", "IRA", "IRAS"]:
        return get_iras_por_establecimiento(establecimiento)
    
    # 🟠 TBC
    if enfermedad_upper in ["TBC TIA", "TBC", "TIA"]:
        return get_tia_por_establecimiento(establecimiento)
    
    if enfermedad_upper in ["TBC TIA EESS"]:
        return get_tia_eess_por_establecimiento(establecimiento)
    
    if enfermedad_upper in ["TBC PULMONAR"]:
        return get_tbc_pulmonar_por_establecimiento(establecimiento)
    
    # 🟣 DEPRESIÓN
    if enfermedad_upper in ["DEPRESION", "DEPRESIÓN"]:
        return get_depresion_por_establecimiento(establecimiento)
    
    # 🟣 VIOLENCIA
    if enfermedad_upper in ["VIOLENCIA", "VIOLENCIA FAMILIAR"]:
        return get_violencia_por_establecimiento(establecimiento)
    
    # 🟣 DIABETES
    if enfermedad_upper in ["DIABETES"]:
        return get_diabetes_por_establecimiento(establecimiento)
    
    # 🟤 CÁNCER
    if enfermedad_upper in ["CANCER", "CÁNCER"]:
        return get_cancer_por_establecimiento(establecimiento)
    
    # 🟣 RENAL
    if enfermedad_upper in ["RENAL"]:
        return get_renal_por_establecimiento(establecimiento)
    
    # 🟣 MUERTE MATERNA
    if enfermedad_upper in ["MUERTE MATERNA"]:
        return get_mortalidad_materna_por_establecimiento(establecimiento)
    
    # Para NOTIWEB_2025
    try:
        conn = connect("EPI_TABLAS_MAESTRO_2025")
        if conn is None:
            return jsonify({"error": "Error de conexión"}), 500
        
        cursor = conn.cursor()
        
        sql = """
            SELECT
                [TIPO_DX],
                COUNT(*) AS Cantidad
            FROM [NOTIWEB_2025]
            WHERE (UPPER(ESTABLECIMIENTO) = UPPER(?)
               OR UPPER([NOMBRE EESS]) = UPPER(?)
               OR UPPER([EESS]) = UPPER(?))
              AND UPPER([DIAGNOSTICO]) = UPPER(?)
            GROUP BY [TIPO_DX]
            ORDER BY Cantidad DESC
        """
        
        cursor.execute(sql, (establecimiento, establecimiento, establecimiento, enfermedad))
        rows = cursor.fetchall()
        
        total = sum(r[1] for r in rows)
        
        detalle = [
            {"tipo_dx": r[0], "cantidad": r[1]}
            for r in rows
        ]
        
        conn.close()
        
        return jsonify({
            "establecimiento": establecimiento,
            "enfermedad": enfermedad,
            "total": total,
            "detalle": detalle
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================
# FUNCIONES ESPECÍFICAS POR ESTABLECIMIENTO
# ============================================================

def get_edas_por_establecimiento(establecimiento):
    conn = get_edas_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT 
                SUM(DAA_C1 + DAA_C1_4 + DAA_C5 + DAA_C5_11 + DAA_C12_17 + DAA_C18_29 + DAA_C30_59 + DAA_C60) as total_daa,
                SUM(DIS_C1 + DIS_C1_4 + DIS_C5 + DIS_C5_11 + DIS_C12_17 + DIS_C18_29 + DIS_C30_59 + DIS_C60) as total_dis
            FROM REPORTE_EDA_2025
            WHERE UPPER([EESS]) = UPPER(?)
               OR UPPER([ESTABLECIMIENTO]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        daa = int(row[0]) if row and row[0] else 0
        dis = int(row[1]) if row and row[1] else 0
        
        return jsonify({
            "establecimiento": establecimiento,
            "daa": daa,
            "dis": dis,
            "total": daa + dis,
            "detalle": [
                {"tipo_dx": "DAA", "cantidad": daa},
                {"tipo_dx": "DIS", "cantidad": dis}
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_febriles_por_establecimiento(establecimiento):
    conn = get_febriles_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        COLUMNAS_FEBRILES = ['feb_m1', 'feb_1_4', 'feb_5_9', 'feb_10_19', 'feb_20_59', 'feb_m60']
        sum_clause = " + ".join([f"[{col}]" for col in COLUMNAS_FEBRILES])
        
        sql = f"""
            SELECT
                {", ".join([f"SUM([{col}]) AS {col}" for col in COLUMNAS_FEBRILES])},
                SUM({sum_clause}) AS total_febriles
            FROM REPORTE_FEBRILES_2025
            WHERE UPPER([EESS]) = UPPER(?)
               OR UPPER([ESTABLECIMIENTO]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({
                "establecimiento": establecimiento,
                "total": 0,
                "detalle": []
            })
        
        column_names = [col[0] for col in cursor.description]
        data = dict(zip(column_names, row))
        
        detalle = [
            {"grupo_edad": col, "cantidad": int(data[col]) if data[col] else 0}
            for col in COLUMNAS_FEBRILES
        ]
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": int(data["total_febriles"]),
            "detalle": detalle
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_iras_por_establecimiento(establecimiento):
    conn = get_iras_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT 
                COALESCE(SUM([IRA_M2]),0)      AS IRA_M2,
                COALESCE(SUM([IRA_2_11]),0)    AS IRA_2_11,
                COALESCE(SUM([IRA_1_4A]),0)    AS IRA_1_4A,

                COALESCE(SUM([SOB_2A]),0)      AS SOB_2A,
                COALESCE(SUM([SOB_2_4A]),0)    AS SOB_2_4A,

                COALESCE(SUM([NGR_M2]),0)      AS NGR_M2,
                COALESCE(SUM([NGR_2_11]),0)    AS NGR_2_11,
                COALESCE(SUM([NGR_1_4A]),0)    AS NGR_1_4A,

                COALESCE(SUM([NEU_2_11]),0)    AS NEU_2_11,
                COALESCE(SUM([NEU_1_4A]),0)    AS NEU_1_4A,
                COALESCE(SUM([NEU_5_9A]),0)    AS NEU_5_9A,
                COALESCE(SUM([NEU_10_19]),0)   AS NEU_10_19,
                COALESCE(SUM([NEU_20_59]),0)   AS NEU_20_59,
                COALESCE(SUM([NEU_60A]),0)     AS NEU_60A
            FROM REPORTE_IRA_2025
            WHERE UPPER([EESS]) = UPPER(?)
               OR UPPER([ESTABLECIMIENTO]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({
                "establecimiento": establecimiento,
                "total": 0,
                "detalle": []
            })
        
        ira_no_neumonia = int(row.IRA_M2) + int(row.IRA_2_11) + int(row.IRA_1_4A)
        sob_asma = int(row.SOB_2A) + int(row.SOB_2_4A)
        neumonia_grave = int(row.NGR_M2) + int(row.NGR_2_11) + int(row.NGR_1_4A)
        neumonia = (
            int(row.NEU_2_11) + int(row.NEU_1_4A) + int(row.NEU_5_9A) +
            int(row.NEU_10_19) + int(row.NEU_20_59) + int(row.NEU_60A)
        )
        
        total = ira_no_neumonia + sob_asma + neumonia_grave + neumonia
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total,
            "ira_no_neumonia": ira_no_neumonia,
            "sob_asma": sob_asma,
            "neumonia_grave": neumonia_grave,
            "neumonia": neumonia,
            "detalle": [
                {"tipo_dx": "IRA NO NEUMONIA", "cantidad": ira_no_neumonia},
                {"tipo_dx": "SOB / ASMA", "cantidad": sob_asma},
                {"tipo_dx": "NEUMONIA GRAVE", "cantidad": neumonia_grave},
                {"tipo_dx": "NEUMONIA", "cantidad": neumonia},
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_tia_por_establecimiento(establecimiento):
    conn = get_TB_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT 
                casos,
                TIA_100k
            FROM TIA_TOTAL
            WHERE UPPER([Distrito_EESS]) = UPPER(?)
               OR UPPER([EESS]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({
                "establecimiento": establecimiento,
                "total": 0,
                "TIA_100k": 0,
                "detalle": []
            })
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": row[0] if row[0] else 0,
            "TIA_100k": float(row[1]) if row[1] else 0,
            "detalle": []
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_tia_eess_por_establecimiento(establecimiento):
    conn = get_TB_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT 
                casos,
                TIA_100k
            FROM TB_TIA_EESS_MINSA
            WHERE UPPER([Distrito_EESS]) = UPPER(?)
               OR UPPER([EESS]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({
                "establecimiento": establecimiento,
                "total": 0,
                "TIA_100k": 0,
                "detalle": []
            })
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": row[0] if row[0] else 0,
            "TIA_100k": float(row[1]) if row[1] else 0,
            "detalle": []
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_tbc_pulmonar_por_establecimiento(establecimiento):
    conn = get_TB_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT COUNT(*) AS total
            FROM TB_BD_SIGTB
            WHERE UPPER([Establecimiento de Salud]) = UPPER(?)
               OR UPPER([EESS]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        total = row[0] if row else 0
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total,
            "detalle": []
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_depresion_por_establecimiento(establecimiento):
    conn = get_depresion_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT COUNT(*) AS total
            FROM Depresion
            WHERE UPPER([Establecimiento]) = UPPER(?)
               OR UPPER([EESS]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        total = row[0] if row else 0
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total,
            "detalle": [
                {"tipo_dx": "DEPRESION", "cantidad": total}
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_violencia_por_establecimiento(establecimiento):
    conn = get_violencia_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT COUNT(*) AS total
            FROM VF_Completo
            WHERE UPPER([ESTABLECIMIENTO]) = UPPER(?)
               OR UPPER([EESS]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        total = row[0] if row else 0
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total,
            "detalle": [
                {"tipo_dx": "Violencia", "cantidad": total}
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_diabetes_por_establecimiento(establecimiento):
    conn = get_diabetes_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT COUNT(*) AS total
            FROM REPORTE_DIABETES
            WHERE UPPER([EESS]) = UPPER(?)
               OR UPPER([ESTABLECIMIENTO]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        total = row[0] if row else 0
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total,
            "detalle": [
                {"tipo_dx": "Diabetes", "cantidad": total}
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_cancer_por_establecimiento(establecimiento):
    conn = get_cancer_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT
                'CANCER' as tipo_dx,
                COUNT(*) as total
            FROM (
                SELECT * FROM REPORTE_CANCER_ADULTO
                WHERE UPPER([EESS]) = UPPER(?)
                   OR UPPER([ESTABLECIMIENTO]) = UPPER(?)
                UNION ALL
                SELECT * FROM REPORTE_CANCER_INFANTIL
                WHERE UPPER([EESS]) = UPPER(?)
                   OR UPPER([ESTABLECIMIENTO]) = UPPER(?)
            ) as cancer_total
        """
        
        cursor.execute(sql, (establecimiento, establecimiento, establecimiento, establecimiento))
        row = cursor.fetchone()
        
        total = row[1] if row else 0
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total,
            "detalle": [
                {"tipo_dx": "CANCER", "cantidad": total}
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_renal_por_establecimiento(establecimiento):
    conn = get_renal_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT COUNT(*) AS total
            FROM BD_RENAL
            WHERE UPPER([EESS]) = UPPER(?)
               OR UPPER([ESTABLECIMIENTO]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        total = row[0] if row else 0
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total,
            "detalle": [
                {"tipo_dx": "Renal", "cantidad": total}
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

def get_mortalidad_materna_por_establecimiento(establecimiento):
    conn = get_mortalidad_connection()
    if conn is None:
        return jsonify({"error": "No connection"}), 500
    
    try:
        cursor = conn.cursor()
        
        sql = """
            SELECT COUNT(*) AS total
            FROM MM_REPORTE_2024
            WHERE UPPER([EESS]) = UPPER(?)
               OR UPPER([ESTABLECIMIENTO]) = UPPER(?)
        """
        
        cursor.execute(sql, (establecimiento, establecimiento))
        row = cursor.fetchone()
        
        total = row[0] if row else 0
        
        return jsonify({
            "establecimiento": establecimiento,
            "total": total,
            "detalle": [
                {"tipo_dx": "mortalidad_materna", "cantidad": total}
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

# ============================================================
# ENDPOINT PARA EXPORTAR DATOS DE ESTABLECIMIENTO
# ============================================================

@app.route("/exportar-datos-establecimiento", methods=["POST", "OPTIONS"])
def exportar_datos_establecimiento():
    if request.method == "OPTIONS":
        response = make_response("", 200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return response

    data = request.get_json()
    establecimiento = data.get("establecimiento")
    diagnosticos = data.get("diagnosticos", [])

    if not establecimiento:
        return jsonify({"error": "No se recibió el establecimiento"}), 400

    # Crear Excel en memoria
    output = io.BytesIO()
    writer = pd.ExcelWriter(output, engine="openpyxl")

    # Información del establecimiento (hoja principal)
    info_df = pd.DataFrame([{
        "Establecimiento": establecimiento,
        "Jurisdicción": "DIRIS LIMA CENTRO",
        "Fecha consulta": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
    }])
    info_df.to_excel(writer, index=False, sheet_name="INFORMACION")

    # Para cada diagnóstico, buscar datos
    for dx in diagnosticos:
        nombre_hoja = dx.replace("diagnostico-", "").upper()[:31]
        
        try:
            # Convertir diagnóstico a nombre para búsqueda
            diag_nombre = dx.replace("diagnostico-", "")
            
            # Buscar en NOTIWEB_2025
            conn = connect("EPI_TABLAS_MAESTRO_2025")
            if conn:
                query = """
                    SELECT *
                    FROM NOTIWEB_2025
                    WHERE (UPPER(ESTABLECIMIENTO) = UPPER(?)
                       OR UPPER([NOMBRE EESS]) = UPPER(?)
                       OR UPPER([EESS]) = UPPER(?))
                      AND UPPER(DIAGNOSTICO) = UPPER(?)
                """
                
                df_diag = pd.read_sql(query, conn, params=[establecimiento, establecimiento, establecimiento, diag_nombre])
                conn.close()
                
                if not df_diag.empty:
                    # Eliminar columnas sensibles
                    columnas_prohibidas = [
                        "APEPAT", "APEMAT", "NOMBRES", "EDAD", "TIPO_EDAD", "SEXO",
                        "DNI", "TIPO_DOC", "LATITUD", "LONGITUD", "COORDENADAS", 
                        "UBICACION", "UBIGEO_DIR", "DIRECCION", "DIRECCION_COMPLETA",
                        "TIPO_VIA", "NUM_PUERTA", "MANZANA", "BLOCK", "INTERIOR",
                        "KILOMETRO", "LOTE", "REFERENCIA", "USUARIO", "FECHA_MOD"
                    ]
                    
                    df_diag = df_diag.drop(
                        columns=[c for c in columnas_prohibidas if c in df_diag.columns],
                        errors="ignore"
                    )
                    
                    hojas_existentes = writer.book.sheetnames
                    original = nombre_hoja
                    contador = 1
                    
                    while nombre_hoja in hojas_existentes:
                        nombre_hoja = f"{original}_{contador}"[:31]
                        contador += 1
                    
                    df_diag.to_excel(writer, index=False, sheet_name=nombre_hoja)
                else:
                    # Hoja vacía con mensaje
                    df_vacio = pd.DataFrame({
                        "Mensaje": [f"No se encontraron registros de {diag_nombre} para el establecimiento {establecimiento}"]
                    })
                    df_vacio.to_excel(writer, index=False, sheet_name=nombre_hoja)
                    
        except Exception as e:
            df_error = pd.DataFrame({"Error": [str(e)]})
            df_error.to_excel(writer, index=False, sheet_name=nombre_hoja)

    writer.close()
    output.seek(0)

    response = send_file(
        output,
        as_attachment=True,
        download_name=f"Datos_{establecimiento.replace(' ', '_')}.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

@app.after_request
def aplicar_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@app.errorhandler(404)
def not_found(e):
    # Si Flask no encuentra la ruta, le entrega el index.html a React
    # para que React Router se encargue de la navegación.
    return send_from_directory(app.static_folder, 'index.html')

# ============================================================
# 🚀 INICIAR SERVER
# ============================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)



# import pyodbc
# import os
# import re 
# from flask import Flask, render_template

# app = Flask(__name__)

# @app.route("/")
# def home():
#     return render_template("index.html")

# if __name__ == "__main__":
#     app.run(debug=True)
    
# # --- 1. CONFIGURACIÓN DE CONEXIONES ---

# # Credenciales (se asume que son las mismas para ambas bases)
# SERVER = os.getenv('DB_SERVER', '10.0.0.10')
# USERNAME = os.getenv('DB_USERNAME', 'knuñes')
# PASSWORD = os.getenv('DB_PASSWORD', '123456')
# DRIVER = '{ODBC Driver 17 for SQL Server}'

# # BASE DE DATOS 1: POBLACIÓN (EPI_TABLAS_MAESTRO_2025)
# DB_POBLACION = os.getenv('DB_DATABASE_POB', 'EPI_TABLAS_MAESTRO_2025')
# CONNECTION_POBLACION = (
#     f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DB_POBLACION};UID={USERNAME};PWD={PASSWORD}"
# )

# # BASE DE DATOS 2: FEBRILES (EPI_BD_FEBRILES)
# DB_FEBRILES = 'EPI_BD_FEBRILES' 
# CONNECTION_FEBRILES = (
#     f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DB_FEBRILES};UID={USERNAME};PWD={PASSWORD}"
# )

# # BASE DE DATOS 3: EDAS (EPI_BD_EDAS)
# DB_EDAS = 'EPI_BD_EDAS' # Nueva base de datos
# CONNECTION_EDAS = (
#     f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DB_EDAS};UID={USERNAME};PWD={PASSWORD}"
# )


# def get_poblacion_connection():
#     """Establece y retorna la conexión a la base de datos de Población."""
#     try:
#         conn = pyodbc.connect(CONNECTION_POBLACION)
#         return conn
#     except pyodbc.Error:
#         return None

# def get_febriles_connection():
#     """Establece y retorna la conexión a la base de datos de Febriles."""
#     try:
#         conn = pyodbc.connect(CONNECTION_FEBRILES)
#         return conn
#     except pyodbc.Error:
#         return None

# def get_edas_connection():
#     """Establece y retorna la conexión a la base de datos de EDAs."""
#     try:
#         conn = pyodbc.connect(CONNECTION_EDAS)
#         return conn
#     except pyodbc.Error:
#         return None

# # --- 2. FUNCIÓN DE RANGO DE EDAD (Se mantiene) ---
# # ... (Se mantiene la función obtener_columnas_por_rango) ...
# def obtener_columnas_por_rango(rango_input):
#     COLUMNAS_EDAD = [
#         '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 
#         '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', 
#         '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', 
#         '55-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85-+'
#     ]
#     rango_input = rango_input.upper().strip()
#     match = re.search(r'(MAYOR DE|MENOR DE|MENOR A|MAYOR A)\s*(\d+)', rango_input)
#     if not match: return None, "Formato no reconocido. Usa 'Mayor de X' o 'Menor de Y'."
#     condicion = match.group(1).replace(' ', '_') 
#     valor_edad = int(match.group(2))
#     columnas_a_sumar = []
    
#     for col in COLUMNAS_EDAD:
#         try:
#             edad_inicio = int(col); edad_fin = edad_inicio
#         except ValueError:
#             if col == '85-+': edad_inicio = 85; edad_fin = 999 
#             else:
#                 inicio, fin = map(int, col.split('-')); edad_inicio = inicio; edad_fin = fin

#         if 'MAYOR' in condicion and edad_inicio >= valor_edad:
#             columnas_a_sumar.append(col)
#         elif 'MENOR' in condicion and edad_fin <= valor_edad:
#             columnas_a_sumar.append(col)

#     if not columnas_a_sumar:
#         return None, f"No se encontraron grupos de edad para la condición '{rango_input}'."
#     sum_clause = " + ".join([f"[{c}]" for c in columnas_a_sumar])
#     return f"SUM({sum_clause})", f"POBLACION {rango_input.replace('DE', '').replace('A', '')} AÑOS"

# # ----------------------------------------------------------------------
# # --- 3. NUEVA FUNCIÓN: CONSULTA DE EDAS ---
# # ----------------------------------------------------------------------

# def consultar_edas_por_distrito():
#     """
#     Consulta el total de casos de EDA (DAA + DIS) por distrito desde 
#     la base de datos EPI_BD_EDAS.
#     """
#     Usar la nueva función de conexión
#     conn = get_edas_connection()
#     if conn is None:
#         print("❌ No se pudo establecer la conexión a la base de datos EPI_BD_EDAS.")
#         return

#     1. Obtener el parámetro del usuario
#     distrito_nombre = input("\n❓ Ingresa el nombre del distrito para la consulta de EDAs (Ej. BREÑA): ").upper().strip()

#     Definir las columnas a sumar
#     COLUMNAS_EDA = [
#         'DAA_C1', 'DAA_C1_4', 'DAA_C5', 'DAA_C5_11', 'DAA_C12_17', 'DAA_C18_29', 'DAA_C30_59', 'DAA_C60',
#         'DIS_C1', 'DIS_C1_4', 'DIS_C5', 'DIS_C5_11', 'DIS_C12_17', 'DIS_C18_29', 'DIS_C30_59', 'DIS_C60'
#     ]
    
#     Crear la sentencia SUM de todas las columnas (Total de EDAs)
#     total_sum_clause = " + ".join([f"[{col}]" for col in COLUMNAS_EDA])
    
#     try:
#         cursor = conn.cursor()

#         Consulta SQL: 
#         1. SUMA de todos los grupos de EDA (DAA y DIS).
#         2. Filtro por el distrito ingresado.
#         sql_query = f"""
#         SELECT
#             SUM({total_sum_clause}) AS Total_EDAs
#         FROM
#             [REPORTE_EDA_2025]
#         WHERE
#             ano = 2025 and [UBIGEO.1.distrito] = ?
#         """
        
#         Ejecutar la consulta con el parámetro del distrito
#         cursor.execute(sql_query, distrito_nombre)
#         row = cursor.fetchone()

#         2. Procesar y mostrar el resultado
#         print("\n" + "💧" * 25)
#         print(f"📊 REPORTE DE VIGILANCIA DE EDAS PARA: **{distrito_nombre}**")
#         print("=" * 60)
        
#         if row and row[0] is not None:
#             total_edas = int(row[0])
#             print(f"El total de casos de EDA (DAA + DIS, en todos los grupos de edad) en **{distrito_nombre}** es: **{total_edas:,}**")
#         else:
#             print(f"⚠️ No se encontraron reportes de EDA en el distrito '{distrito_nombre}'.")
#         print("💧" * 25)

#     except pyodbc.ProgrammingError as pe:
#         print(f"❌ Error en la consulta SQL. Detalle: {pe}")
#     except Exception as e:
#         print(f"❌ Ocurrió un error inesperado: {e}")
#     finally:
#         if conn:
#             conn.close()

# # ----------------------------------------------------------------------
# # --- 4. FUNCIONES DE POBLACIÓN Y VIGILANCIA (Se mantienen) ---
# # ----------------------------------------------------------------------

# (Las funciones de febriles, población y casos por enfermedad se mantienen igual,
# usando sus respectivas funciones de conexión: get_febriles_connection() y get_poblacion_connection().)

# def obtener_resumen_distrito():
#     conn = get_poblacion_connection()
#     if conn is None:
#         print("❌ No se pudo establecer la conexión a la base de datos de Población.")
#         return
#     distrito_nombre = input("\n❓ Ingresa el nombre del distrito para el resumen (Ej. BREÑA): ").upper().strip()
#     try:
#         cursor = conn.cursor()
#         sql_query = """
#         SELECT
#             SUM([MASCULINO] + [FEMENINO]) AS POBLACION_TOTAL,
#             SUM([MASCULINO]) AS MASCULINO,
#             SUM([FEMENINO]) AS FEMENINO,
#             SUM([NIÑO]) AS NIÑO,
#             SUM([Adolescente]) AS Adolescente,
#             SUM([Joven]) AS Joven,
#             SUM([Adulto]) AS Adulto,
#             SUM([Adulto Mayor]) AS Adulto_Mayor
#         FROM [POBLACION_2025_DIRIS_LIMA_CENTRO]
#         WHERE [DISTRITO] = ?
#         """
#         cursor.execute(sql_query, distrito_nombre)
#         row = cursor.fetchone()
#         print("\n" + "🌟" * 25)
#         if row and row[0] is not None:
#             column_names = [col[0] for col in cursor.description]
#             data = dict(zip(column_names, row))
#             print(f"✨ RESUMEN DE POBLACIÓN PARA: **{distrito_nombre}** ✨")
#             print("=" * 60)
#             print(f"**POBLACIÓN TOTAL:** {data['POBLACION_TOTAL']:,}")
#             print("-" * 25)
#             print("**Población por Sexo:**")
#             print(f"  MASCULINO: {data['MASCULINO']:,}")
#             f"  FEMENINO: {data['FEMENINO']:,}"
#             print("-" * 25)
#             print("**Población por Curso de Vida:**")
#             print(f"  NIÑO: {data['NIÑO']:,}")
#             print(f"  ADOLESCENTE: {data['Adolescente']:,}")
#             print(f"  JOVEN: {data['Joven']:,}")
#             print(f"  ADULTO: {data['Adulto']:,}")
#             print(f"  ADULTO MAYOR: {data['Adulto_Mayor']:,}")
#         else:
#             print(f"⚠️ No se encontró el distrito '{distrito_nombre}' en la base de datos.")
#         print("🌟" * 25)
#     except pyodbc.ProgrammingError as pe:
#         print(f"❌ Error en la consulta SQL. Detalle: {pe}")
#     except Exception as e:
#         print(f"❌ Ocurrió un error inesperado: {e}")
#     finally:
#         if conn: conn.close()

# def consultar_casos_enfermedad():
#     conn = get_poblacion_connection()
#     if conn is None:
#         print("❌ No se pudo establecer la conexión a la base de datos de Población (NOTIWEB).")
#         return
#     distrito_nombre = input("\n❓ Ingresa el nombre del distrito (Ej. BREÑA): ").upper().strip()
#     enfermedad = input("❓ Ingresa el nombre del DIAGNOSTICO (Ej. TOS FERINA): ").upper().strip()
#     try:
#         cursor = conn.cursor()
#         sql_query = """
#         SELECT
#             [TIPO_DX],
#             COUNT(*) AS Cantidad
#         FROM
#             [NOTIWEB_2025]
#         WHERE
#             [distrito] = ?
#             AND [DIAGNOSTICO] = ?
#             AND [subregion] = 'DIRIS LIMA CENTRO' 
#         GROUP BY
#             [TIPO_DX]
#         ORDER BY
#             Cantidad DESC
#         """
#         cursor.execute(sql_query, distrito_nombre, enfermedad)
#         resultados = cursor.fetchall()
#         print("\n" + "🦠" * 20)
#         print(f"🔬 CASOS DE **{enfermedad}** EN **{distrito_nombre}**")
#         print("=" * 60)
#         if resultados:
#             total_casos = 0
#             detalle_casos = []
#             for tipo_dx, cantidad in resultados:
#                 detalle_casos.append(f"{cantidad}{tipo_dx[0]}")
#                 total_casos += cantidad
#             detalle_str = ', '.join(detalle_casos)
#             print(f"Del distrito de **{distrito_nombre}** hay **{total_casos}** casos de **{enfermedad}** ({detalle_str}).")
#             print("\nDetalle por Tipo de Diagnóstico:")
#             for tipo_dx, cantidad in resultados:
#                 print(f"  - {tipo_dx}: {cantidad:,} casos")
#         else:
#             print(f"⚠️ No se encontraron casos de '{enfermedad}' en el distrito '{distrito_nombre}'.")
#         print("🦠" * 20)
#     except pyodbc.ProgrammingError as pe:
#         print(f"❌ Error en la consulta SQL. Detalle: {pe}")
#     except Exception as e:
#         print(f"❌ Ocurrió un error inesperado: {e}")
#     finally:
#         if conn: conn.close()

# def consultar_febriles_por_distrito():
#     conn = get_febriles_connection()
#     if conn is None:
#         print("❌ No se pudo establecer la conexión a la base de datos EPI_BD_FEBRILES.")
#         return
#     distrito_nombre = input("\n❓ Ingresa el nombre del distrito para la consulta de febriles (Ej. BREÑA): ").upper().strip()
#     COLUMNAS_FEBRILES = ['feb_m1', 'feb_1_4', 'feb_5_9', 'feb_10_19', 'feb_20_59', 'feb_m60']
#     select_columns = [f"SUM([{col}]) AS {col}" for col in COLUMNAS_FEBRILES]
#     select_columns_str = ", ".join(select_columns)
#     total_sum_clause = " + ".join([f"[{col}]" for col in COLUMNAS_FEBRILES])
#     try:
#         cursor = conn.cursor()
#         sql_query = f"""
#         SELECT
#             {select_columns_str},
#             SUM({total_sum_clause}) AS Total_Febriles
#         FROM
#             [REPORTE_FEBRILES_2025]
#         WHERE
#             [UBIGEO.1.distrito] = ?
#             AND [UBIGEO.1.subregion] = 'DIRIS LIMA CENTRO'
#             and ano = 2025
#         """
#         cursor.execute(sql_query, distrito_nombre)
#         row = cursor.fetchone()
#         print("\n" + "🔥" * 25)
#         print(f"🌡️ REPORTE DE VIGILANCIA DE ENFERMEDADES FEBRILES PARA: **{distrito_nombre}**")
#         print("=" * 60)
#         if row and row[0] is not None:
#             column_names = [col[0] for col in cursor.description]
#             data = dict(zip(column_names, row))
#             total_febriles = int(data['Total_Febriles'])
#             print(f"**TOTAL DE CASOS FEBRILES:** **{total_febriles:,}**")
#             print("-" * 25)
#             print("**Desglose por Grupo de Edad:**")
#             for col in COLUMNAS_FEBRILES:
#                 valor = int(data[col]) if data[col] is not None else 0
#                 print(f"  [{col}]: {valor:,}")
#         else:
#             print(f"⚠️ No se encontraron reportes de febriles en el distrito '{distrito_nombre}' para la subregión 'DIRIS LIMA CENTRO'.")
#         print("🔥" * 25)
#     except pyodbc.ProgrammingError as pe:
#         print(f"❌ Error en la consulta SQL. Detalle: {pe}")
#     except Exception as e:
#         print(f"❌ Ocurrió un error inesperado: {e}")
#     finally:
#         if conn: conn.close()

# def consultar_poblacion_detallada():
#     conn = get_poblacion_connection()
#     if conn: conn.close()

#     print("\n--- TIPOS DE CONSULTA ---")
#     print("1: Por Curso de Vida (Población)")
#     print("2: Por Sexo (Población)")
#     print("3: Población Total")
#     print("4: Por Rango de Edad (Población)")
#     print("5: Resumen Completo por Distrito (Población)")
#     print("6: Casos por Enfermedad y Tipo de DX (Vigilancia - NOTIWEB)")
#     print("7: Casos Febriles por Distrito (Vigilancia - FEBRILES)")
#     print("8: **Casos de EDA por Distrito (Vigilancia - EDAS)**") # Opción 8
    
#     tipo_consulta = input("Elige el número de la consulta (1-8): ").strip()

#     if tipo_consulta == '5':
#         obtener_resumen_distrito()
#     elif tipo_consulta == '6':
#         consultar_casos_enfermedad()
#     elif tipo_consulta == '7':
#         consultar_febriles_por_distrito()
#     elif tipo_consulta == '8':
#         consultar_edas_por_distrito() # Llamada a la nueva función
#     elif tipo_consulta in ['1', '2', '3', '4']:
#         conn = get_poblacion_connection()
#         if conn is None: return
        
#         CURSOS_VIDA = ['NIÑO', 'ADOLESCENTE', 'JOVEN', 'ADULTO', 'ADULTO MAYOR']
#         SEXOS = ['MASCULINO', 'FEMENINO']
#         distrito_nombre = input("❓ Ingresa el nombre del distrito: ").upper().strip()
#         columna_sql = ""
#         alias_columna = "VALOR_CONSULTADO"
        
#         if tipo_consulta == '1':
#             print(f"\nCursos de Vida disponibles: {', '.join(CURSOS_VIDA)}")
#             campo = input("Ingresa el Curso de Vida a consultar: ").upper().strip()
#             if campo not in CURSOS_VIDA: print(f"⚠️ Error: '{campo}' no es válido."); conn.close(); return
#             columna_sql = f"SUM([{campo}])"; alias_columna = campo
#         elif tipo_consulta == '2':
#             print(f"\nSexos disponibles: {', '.join(SEXOS)}")
#             campo = input("Ingresa el Sexo a consultar: ").upper().strip()
#             if campo not in SEXOS: print(f"⚠️ Error: '{campo}' no es válido."); conn.close(); return
#             columna_sql = f"SUM([{campo}])"; alias_columna = campo
#         elif tipo_consulta == '3':
#             columna_sql = "SUM([MASCULINO] + [FEMENINO])"; alias_columna = "POBLACION TOTAL"
#         elif tipo_consulta == '4':
#             rango_input = input("Ingresa la condición de edad (Ej. Mayor de 30 o Menor de 10): ")
#             columna_sql, alias_columna = obtener_columnas_por_rango(rango_input)
#             if columna_sql is None: print(f"⚠️ Error al procesar el rango: {alias_columna}"); conn.close(); return
        
#         try:
#             cursor = conn.cursor()
#             sql_query = f"SELECT {columna_sql} AS RESULTADO FROM [POBLACION_2025_DIRIS_LIMA_CENTRO] WHERE [DISTRITO] = ?"
#             cursor.execute(sql_query, distrito_nombre)
#             row = cursor.fetchone()
#             print("\n" + "=" * 60)
#             if row and row[0] is not None:
#                 valor = int(row[0])
#                 print(f"Resultados para el distrito: **{distrito_nombre}**")
#                 print(f"Criterio: **{alias_columna}**")
#                 print(f"Población: **{valor:,}**")
#             else:
#                 print(f"⚠️ No se encontró el distrito '{distrito_nombre}' o no hay datos para esa selección.")
#             print("=" * 60)
#         except Exception as e:
#             print(f"❌ Ocurrió un error: {e}")
#         finally:
#             if conn: conn.close()
#     else:
#         print("⚠️ Opción de consulta no válida.")

# # --- 5. EJECUTAR EL PROGRAMA ---

# if __name__ == "__main__":
#     consultar_poblacion_detallada()