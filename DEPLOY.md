# INSUBLIMEX · Registro de Ventas — Puesta en marcha

Todo se hace con la cuenta **Insublimexoperaciones@gmail.com**. Nada queda ligado a otra cuenta.

## Parte 1 — Google (hoja, carpeta y "usuario robot")

### A. Crear la hoja y la carpeta
1. Entra a [sheets.google.com](https://sheets.google.com) con `Insublimexoperaciones@gmail.com` y crea una hoja nueva. Ponle de nombre **INSUBLIMEX - Registro de Ventas**. No escribas nada dentro: la app crea los encabezados sola.
2. Copia el ID de la hoja. Está en la barra de direcciones:
   `https://docs.google.com/spreadsheets/d/`**`ESTE-PEDAZO-LARGO-ES-EL-ID`**`/edit`
3. *(Opcional, solo con Google Workspace)* Carpeta de Drive para comprobantes. Con una cuenta Gmail, Google no deja que la cuenta de servicio guarde archivos en Drive ("Service Accounts do not have storage quota"), así que **las fotos se guardan en el servidor** y la hoja lleva el enlace. No hace falta carpeta.

### B. Crear el proyecto y la cuenta de servicio
4. Entra a [console.cloud.google.com](https://console.cloud.google.com) con la misma cuenta. Si es la primera vez, acepta los términos.
5. Arriba a la izquierda, en el selector de proyectos, pulsa **"Proyecto nuevo"**. Nombre: `Insublimex Registro`. Pulsa **Crear** y espera unos segundos a que quede seleccionado.
6. En el buscador de arriba escribe **"Google Sheets API"**, ábrela y pulsa **Habilitar**.
7. Repite con **"Google Drive API"** → **Habilitar**.
8. En el buscador escribe **"Cuentas de servicio"** (Service Accounts) y ábrelo. Pulsa **"+ Crear cuenta de servicio"**.
   - Nombre: `registro-ventas`
   - Pulsa **Crear y continuar**, luego **Continuar** y **Listo** (no hace falta asignar roles).
9. En la lista aparece la cuenta con un correo parecido a `registro-ventas@insublimex-registro.iam.gserviceaccount.com`. **Copia ese correo**, lo vas a usar en el paso 11.
10. Haz clic en esa cuenta → pestaña **"Claves"** → **"Agregar clave"** → **"Crear clave nueva"** → tipo **JSON** → **Crear**. Se descarga un archivo. **Renómbralo a `service-account.json`** y guárdalo: es la llave de la app. No lo mandes por WhatsApp ni lo subas a ningún sitio público.

### C. Darle permiso al robot
11. Abre la hoja del paso 1 → botón **Compartir** → pega el correo del paso 9 → permiso **Editor** → desmarca "Notificar" → **Compartir**.
12. *(Solo si usas Workspace y la carpeta del paso 3)* compártela igual con ese correo como Editor.

Con eso Google está listo. Sin el paso 11 la app arranca pero dirá "La cuenta de servicio no puede acceder".

> Estado al 13/09/2026: pasos 1-11 **ya hechos** con `Insublimexoperaciones@gmail.com`. Hoja `1-GAxneIndqUcVvCNFYgnoV2AXnF2Pkh6yIQUnF9FnGU`, cuenta de servicio `registro-ventas@insublimex-registro.iam.gserviceaccount.com`. Probado: escribe filas, cambia estados, guarda comprobantes.

## Parte 2 — El servidor (VPS de n8n)

13. Sube la carpeta del proyecto al VPS (por ejemplo a `/opt/insublimex-ventas`) y dentro coloca:
    - `service-account.json` (paso 10)
    - `.env` copiado de `.env.example` con:
      ```
      ADMIN_PIN=una-clave-larga-que-sabrán-las-asesoras
      SHEETS_SPREADSHEET_ID=1-GAxneIndqUcVvCNFYgnoV2AXnF2Pkh6yIQUnF9FnGU
      RECEIPT_STORAGE=local
      ASESORAS=Nombre Uno,Nombre Dos,Nombre Tres
      PUBLIC_URL=https://ventas.insublimexvnzla.com
      ```
14. Crea el subdominio `ventas.insublimexvnzla.com` apuntando a la IP del VPS (mismo sitio donde está `n8n.insublimexvnzla.com`).
15. Levanta la app: `docker compose up -d --build`. Queda escuchando en `127.0.0.1:3010`.
16. En el proxy que ya usa n8n (Traefik / Caddy / Nginx Proxy Manager) agrega `ventas.insublimexvnzla.com → localhost:3010` con certificado HTTPS.
17. Comprueba: `https://ventas.insublimexvnzla.com/api/health` debe responder `{"status":"ok","google":true,...}`.

## Cómo se usa
- **Asesoras:** `https://ventas.insublimexvnzla.com` → clave del equipo → panel.
- **Clientes:** `https://ventas.insublimexvnzla.com/?portal=cliente` (el panel tiene el botón "Copiar enlace / mensaje WhatsApp").
- **Gerencia:** la hoja de Google es la base de datos. La app solo escribe; la hoja se puede filtrar, exportar o compartir como siempre.

## Si algo falla
- **"Google sin conectar" en el panel:** falta `service-account.json`, `SHEETS_SPREADSHEET_ID`, o no se compartió la hoja (paso 11). Mientras tanto las ventas quedan guardadas en `data/pending.json` y se pasan solas a la hoja cuando se arregle.
- **"N en cola" en el panel:** Google no respondió en ese momento; el servidor reintenta cada minuto. No hay que hacer nada.
- **Cambiar la clave o las asesoras:** editar `.env` y `docker compose up -d`.
- **Las fotos de comprobantes** viven en el volumen `ventas-uploads` del VPS. Conviene incluirlo en el respaldo del servidor junto con el de n8n.
