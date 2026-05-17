# Scrum Poker

Aplicacion web simple para hacer sesiones de Planning Poker con equipos Scrum.

No usa login ni registro. Cada integrante escribe su nombre, entra a una sala por codigo y vota con cartas de la secuencia Fibonacci.

## Caracteristicas

- Salas por codigo compartible.
- Lobby inicial para crear una sala nueva o entrar a una sala activa.
- Eliminacion de salas activas desde el lobby.
- Entrada sin login.
- Nombre visible para identificar quien voto.
- Votos ocultos hasta revelar.
- Cartas con secuencia Fibonacci: `0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89`.
- Promedio de la votacion.
- Resultado redondeado hacia abajo respetando Fibonacci.
- Boton para compartir el link de la sala.
- Sonidos en las acciones principales.
- Efecto de confetti al revelar los votos.
- Interfaz responsive para computador y celular.

## Estructura

```text
scrum-poker/
  static/
    app.js
    styles.css
  .gitignore
  .nojekyll
  app.py
  index.html
  iniciar.ps1
  Procfile
  README.md
```

## Como ejecutar localmente

Necesitas tener Python 3 instalado.

En Windows, abre PowerShell dentro de la carpeta del proyecto y ejecuta:

```powershell
.\iniciar.ps1
```

Tambien puedes ejecutar directamente:

```powershell
python app.py
```

Luego abre en el navegador:

```text
http://127.0.0.1:8000
```

## Como usar

1. Escribe tu nombre.
2. Crea una sala nueva, elige una sala activa o escribe un codigo manual, por ejemplo `SPRINT-12`.
3. Comparte el link con el boton `Compartir sala`.
4. Cada integrante elige una carta.
5. Cuando todos hayan votado, presiona `Revelar`.
6. La app muestra el promedio y el resultado redondeado hacia abajo a Fibonacci.
7. Para estimar otra historia, escribe el nombre de la tarea y presiona `Nueva ronda`.
8. Para limpiar el lobby, usa `Eliminar` sobre una sala activa.

## Subir a GitHub usando la UI

1. Crea un repositorio nuevo en GitHub.
2. Entra al repositorio.
3. Presiona `Add file` y luego `Upload files`.
4. Arrastra el contenido de la carpeta `scrum-poker`.
5. Verifica que `app.py`, `index.html`, `Procfile`, `README.md` y la carpeta `static` queden en la raiz del repositorio.
6. Presiona `Commit changes`.

## Importante sobre GitHub Pages

Esta app necesita un servidor para que varias personas compartan la misma sala en tiempo real.

GitHub Pages solo sirve archivos estaticos, por eso no es suficiente para mantener las salas sincronizadas.

GitHub sirve para guardar el codigo. Para usar la app online con tu equipo, debes desplegarla en un hosting que ejecute Python, por ejemplo:

- Render
- Railway
- Fly.io
- Un VPS

## Despliegue

En un hosting compatible con Python, el comando de inicio es:

```text
python app.py
```

El proyecto incluye un `Procfile`:

```text
web: python app.py
```

Si el hosting entrega una variable `PORT`, la app la usa automaticamente.

## Notas

La informacion de las salas se guarda en memoria mientras el servidor esta corriendo. Si el servidor se reinicia, las salas activas se limpian.
