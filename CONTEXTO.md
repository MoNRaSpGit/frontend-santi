# frontend-santi

Demo para mostrar a un amigo (Santi). Datos de ejemplo (clientes, pagos, menús) **guardados en el backend** (`backend/src/modules/santi`, tablas `saas_santi_*`, migración 121, rutas `/api/v1/santi/*`, sin login). El frontend pide `GET /santi/state` al abrir y cada acción (pago, cliente, menú, historial) vuelve a traer el estado. "Reiniciar ejemplo" = `POST /santi/reset` (tarda unos segundos). Vite + JS plano (sin React), tres archivos: `index.html`, `src/main.js`, `src/styles.css`.

## Qué tiene
- **Buscador de arriba**: busca cliente por nombre o calle; al tocar un resultado se despliega todo (si pagó, menú de la semana, qué compró, pagos y recibos, menú de hoy).
- **Pagos**: total que nos deben + "Registrar pago" (el pago queda anotado en el historial).
- **Clientes**: lista, menú de hoy, menú de toda la semana (lista desplegable con las 3 opciones), historial de pedidos editable (eliges entre las 3 opciones), pagos y recibos, y "+ Ingresar cliente" (nombre y/o calle; si solo pone la calle, el cliente se llama así).
- **Historial** (pestaña de pagos): todos los pagos, filtro por cliente, botón "Recibo por WhatsApp" con vista previa del mensaje (ficticio, no manda nada).
- **Panel**: mes actual (vendí = cobrado, ganancia 30%, cuánto nos deben), gráfica ondulada de los últimos 7 días y movimientos del mes.
- **☰ (hamburguesa)**: "Menú de la semana": 4+ menús, siempre 3 opciones activas por semana, botón "Enviar las 3 opciones al WhatsApp" (ficticio).

## Deploy
- GitHub Actions → Pages en cada push a main (`.github/workflows/deploy.yml`, `npm run build:gh`, base relativa `./`).
- En el repo hay que activar Settings → Pages → Source: GitHub Actions.

## Historia
- El backend carga solo los datos de ejemplo si las tablas están vacías. Nació como un Artifact de claude.ai (https://claude.ai/artifact/WdT1PNvqnXHdoWKnd1gKNd) y se pasó a este proyecto el 09/11/2026 tal cual (mismo comportamiento).
- Si se quiere crecer en serio: migrar a React/TS como los demás frontends y, recién ahí, backend.
