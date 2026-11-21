# Tienda de Valorant

App local para una sola cuenta. Muestra la tienda diaria de skins de arma, los lotes destacados y la lista de deseos, y guarda cada ciclo y cada lote que llega a ver.

## Requisitos

Node.js 20.18 o más nuevo.

```bash
npm install
npm run dev
```

La app escucha en `http://127.0.0.1:3000`.

## Para usar en Windows, sin Node ni git

En cada [GitHub Release](https://github.com/Sanguet/valorant-store-tracker/releases) hay un `valorant-tienda-windows.zip`.

1. Descargá el zip y descomprimilo.
2. Abrí el Riot Client e iniciá sesión ahí.
3. Hacé doble clic en `Abrir la tienda.bat`.
4. Se abre el navegador. No cierres la ventana negra mientras la uses.

El historial queda en `%LOCALAPPDATA%\ValorantStoreTracker`. Una versión nueva se descomprime en otra carpeta y no borra ese historial.

El release lo arma `.github/workflows/release-windows.yml` al pushear un tag `v*` o al correr el workflow a mano.

## Cómo se lee la tienda

La única vía es el Riot Client abierto en esta máquina. La app lee el lockfile. No hay usuario ni contraseña.

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
