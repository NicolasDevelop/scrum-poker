# Scrum Poker

Aplicacion web simple para hacer sesiones de Planning Poker con equipos Scrum.

No usa login ni registro. Cada integrante escribe su nombre, entra a una sala por codigo y vota con cartas de la secuencia Fibonacci.

## Caracteristicas

- Salas por codigo compartible.
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
2. Escribe un codigo de sala, por ejemplo `SPRINT-12`.
3. Presiona `Entrar a la sala`.
4. Comparte el link con el boton `Compartir sala`.
5. Cada integrante elige una carta.
6. Cuando todos hayan votado, presiona `Revelar`.
7. La app muestra el promedio y el resultado redondeado hacia abajo a Fibonacci.
8. Para estimar otra historia, escribe el nombre de la tarea y presiona `Nueva ronda`.
