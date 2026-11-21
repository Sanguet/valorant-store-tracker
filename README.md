# Tienda de Valorant

App local para una sola cuenta. Muestra la tienda diaria de skins de arma, los lotes destacados y la lista de deseos, y guarda cada ciclo y cada lote que llega a ver.

## Requisitos

Node.js 20.18 o más nuevo.

```bash
npm install
npm run dev
```

La app escucha en `http://127.0.0.1:3000`.

## Cómo se lee la tienda

En Conexión se elige una vía. Si esa falla, la app no salta a la otra.

- **Cliente local.** El Riot Client está abierto en esta máquina. Se lee el lockfile y no se guarda la contraseña.
- **Inicio de sesión de Riot.** El login se completa en el servidor de esta app. La contraseña no se guarda. La sesión queda en `data/`, que no se versiona.

Los nombres y las imágenes salen de valorant-api.com, en el idioma del cliente. Las imágenes se guardan en disco.

Al pedir el storefront se prueba `POST /store/v3/storefront/{puuid}` y, si responde 404 o 405, `GET /store/v2/storefront/{puuid}`. La versión que responde queda recordada para la próxima lectura.

La primera cuenta que una lectura identifica queda fija. Otra cuenta no se mezcla con este historial.

## Sin el cliente

```bash
npm run dev:ejemplo
```

O, con la app abierta, **Cargar la tienda de ejemplo**. Usa el fixture fijo de `fixtures/demo.ts`: no abre el cliente, no inicia sesión y no usa la red. Si ya hay una cuenta real guardada, hay que borrar los datos locales antes.

```bash
npm test
```

Las pruebas usan ese fixture. No llaman al cliente ni a Riot.
