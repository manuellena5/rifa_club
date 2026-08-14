# Rifa del Club

App para vender rifa entre varios vendedores desde el celular, sin números físicos.
Funciona sin internet: cada uno carga y se sube solo cuando vuelve la señal.

- `index.html` — la app entera (un solo archivo)
- `google-apps-script.js` — el backend, va pegado en Apps Script
- `sw.js`, `manifest.json`, `icon-*.png` — para que se instale en el celular

---

## 1. La planilla

1. Google Drive → nueva Hoja de cálculo. Nombre: **Rifa del Club**.
2. Menú **Extensiones → Apps Script**.
3. Borrá lo que haya y pegá todo el contenido de `google-apps-script.js`. Guardá (💾).
4. Arriba, en el selector de funciones, elegí **`crearHojas`** y apretá **Ejecutar**.
   La primera vez te va a pedir permiso: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a (no seguro) → Permitir*. Es tu propio script, no hay riesgo.
5. Se crean cuatro pestañas: **Ventas**, **Config**, **Vendedores**, **Ganadores**.

### Qué cargar a mano

**Vendedores** — un nombre por fila, columna Activo en `SI`. Estos son los que van a aparecer en el desplegable de la app. Podés agregar o sacar cuando quieras; los vendedores lo ven la próxima vez que abren.

**Config** — los valores que manejan toda la rifa:

| Clave | Ejemplo | Para qué |
|---|---|---|
| `nombreRifa` | Rifa Club Mitre | El título que se ve arriba |
| `totalNumeros` | 300 | Cuántos números hay |
| `precios` | `1=10000; 2=15000; 3=22000` | Precio **total** según cuántos lleve la misma persona |
| `precioExtra` | 7000 | Lo que suma cada número más allá del último escalón |
| `premios` | `1º Premio \| 2º Premio \| 3º Premio` | Separados por barra |
| `token` | (poné una clave tuya) | Sin esto cualquiera que tenga el link podría escribir |
| `ventaAbierta` | SI | Poné `NO` el día del sorteo y nadie puede cargar más |
| `msgWhatsapp` | (ver abajo) | Comprobante cuando lleva **varios** números |
| `msgWhatsapp1` | (ver abajo) | Comprobante cuando lleva **uno solo**, en singular |

Todo esto lo cambiás en la planilla y los vendedores lo reciben solos. No hay que tocar código.

### El comprobante por WhatsApp

Es el texto que el vendedor le manda al comprador después de cargar la venta. **Hay dos plantillas** y la app elige sola cuál usar: `msgWhatsapp1` si la persona llevó un solo número, `msgWhatsapp` si llevó varios. Así el mensaje queda bien redactado en los dos casos y no aparece un "Tus números son: 2" que se lee como si fueran dos.

Ambas aceptan los mismos comodines:

`{nombre}` `{numeros}` `{cantidad}` `{monto}` `{rifa}` `{vendedor}` `{pago}` `{premios}`

Para cortar renglón escribí `\n` (barra invertida y ene), **no** Alt+Enter. Por defecto quedan:

```
msgWhatsapp1 (un solo número)
Hola {nombre}! Gracias por colaborar con la {rifa}.\nTu número es el {numeros}\nTotal: {monto} ({pago})\nTe lo vendió {vendedor}. ¡Mucha suerte!

msgWhatsapp (varios números)
Hola {nombre}! Gracias por colaborar con la {rifa}.\nTus números son: {numeros}\nTotal: {monto} ({pago})\nTe los vendió {vendedor}. ¡Mucha suerte!
```

`{numeros}` se arma en castellano: con uno queda `47`, con varios `12, 13 y 47`.

> Si ya tenías la planilla creada de antes, corré **Rifa → Crear / reparar hojas**: agrega las claves que falten sin tocar el resto de lo que cargaste.

---

## 2. Publicar el backend

En Apps Script: **Implementar → Nueva implementación → ⚙ → Aplicación web**

- Descripción: `v1`
- Ejecutar como: **Yo**
- Quién tiene acceso: **Cualquier persona**

Copiá la **URL que termina en `/exec`**. Esa es la dirección de la app.

> ⚠ **Cada vez que edites `google-apps-script.js` hay que volver a implementar** (Implementar → Administrar implementaciones → lápiz → Versión: **Nueva versión**). Si no, el front manda cosas que el backend ignora en silencio y no te enterás.

---

## 3. Publicar la app en GitHub Pages

```bash
cd C:\Users\manuel.ellena\Git\rifa_club
git init
git add .
git commit -m "Rifa del club"
git branch -M main
git remote add origin https://github.com/USUARIO/rifa-club.git
git push -u origin main
```

En GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
A los dos minutos queda en `https://USUARIO.github.io/rifa-club/`.

### Que nadie tenga que configurar nada

Antes de subir, abrí `index.html` y completá arriba de todo:

```js
const API_URL_FIJA = 'https://script.google.com/macros/s/AKfy...../exec';
const TOKEN_FIJO   = 'la-clave-que-pusiste';
```

Así el vendedor abre el link, elige su nombre y listo. Si los dejás vacíos, cada uno tiene que pegar la URL y la clave a mano en Ajustes.

> El token queda a la vista de cualquiera que mire el código de la página. Sirve para que un curioso no escriba por accidente, no para guardar un secreto. No pongas ahí una contraseña que uses en otro lado.

---

## 4. Repartir a los vendedores

Mandales el link por WhatsApp con este texto:

> Abrí este link: `https://USUARIO.github.io/rifa-club/`
> Tocá el menú del navegador y elegí **"Agregar a pantalla de inicio"**. Te queda como una app.
> Adentro, andá a **Ajustes** y elegí tu nombre. Eso es todo.

Una vez agregada a la pantalla de inicio funciona sin internet: podés cargar ventas en la cancha y se suben solas cuando volvés a tener señal.

---

## Cómo funciona por dentro

**El reparto de bloques es de palabra, no lo controla la app.** Cualquiera puede cargar cualquier número. Si dos cargan el mismo, ninguna venta se pisa: las dos quedan en la planilla y la app avisa con un cartel de *NÚMEROS REPETIDOS* para que lo arreglen entre ellos.

**Una operación = varios números + un monto.** Si a la misma persona le vendés el 12 y el 13, es una sola fila con `12, 13` y el precio de promo. Por eso el precio no se puede calcular multiplicando.

**Nada se borra.** Anular una venta escribe `SI` en la columna Anulado; la fila queda para auditar.

**El WhatsApp se manda desde el celular del vendedor, no desde un servidor.** Al guardar una venta aparece un botón que abre WhatsApp con el chat del comprador y el mensaje ya escrito; el vendedor solo aprieta enviar. No hay costo, no hay API de Meta, no hay número del club. La contra es que siempre hace falta ese toque: no se puede mandar solo.

**El teléfono se acomoda solo.** El vendedor lo escribe como se lo dicten — `0342 15 512-3456`, `+54 342...`, `3425123456` — y la app lo convierte a formato internacional. Debajo del campo se ve en vivo a qué número va a llegar. Si no da un móvil argentino válido, la venta se guarda igual pero queda marcada como *sin WhatsApp* en Mis ventas. Lo que se guarda en la planilla ya va normalizado.

**El sorteo saca solo entre números vendidos**, así que nunca puede salir uno vacío. Un número que ya ganó no entra en el premio siguiente. Los ganadores se guardan en la planilla.

**Se puede volver a sortear un premio.** Cada ganador de la lista tiene su botón *Volver a sortear*. Al confirmar te pregunta si el número que había ganado vuelve al bolillero o queda afuera de todos los premios — lo primero sirve cuando sorteaste por error, lo segundo cuando el ganador no correspondía. Hace falta internet: el ganador se anula en la planilla antes de tocar nada en el celular, así dos personas no pueden re-sortear el mismo premio a la vez.

La fila del ganador anulado **no se borra**: queda en la hoja Ganadores con `Anulado = SI`, y la columna `VuelveAlBolillero` dice si ese número sigue participando. Si te arrepentiste de dejar un número afuera, cambiá esa celda a `SI` y actualizá desde la app.

**Consumo de Apps Script:** una llamada por venta cargada, más una al abrir la app. Con 5 vendedores y 300 números no llegás ni cerca del límite diario.

---

## Mantenimiento

Cada vez que toques `index.html`, `sw.js` o `manifest.json`, **subí `SW_VERSION` en `sw.js`** antes de hacer commit. Si no, los celulares que ya la tienen instalada siguen viendo la versión vieja. La versión activa se ve abajo de todo en Ajustes.
