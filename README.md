# Arcas Joyeros · Gestión de pedidos

Proyecto refactorizado en módulos ES nativos, sin bundler.

## Estructura

```text
/mi-proyecto
├── index.html
├── README.md
├── css/
│   └── styles.css
└── js/
    ├── main.js
    ├── config.js
    ├── state.js
    ├── firebase.js
    ├── scanner.js
    └── ui.js
```

## Responsabilidades

- `index.html`: estructura de la aplicación.
- `css/styles.css`: estilos y responsive.
- `js/config.js`: configuración estática, incluida Firebase.
- `js/state.js`: estado global compartido.
- `js/firebase.js`: autenticación anónima, Firestore y persistencia.
- `js/scanner.js`: cámara, OCR y lectura del código.
- `js/ui.js`: DOM, navegación, modales y renders.
- `js/main.js`: inicialización, listeners y orquestación.

## Cómo abrirlo

Abre `index.html` desde un servidor local, por ejemplo:

```bash
python -m http.server 8000
```

Luego entra en `http://localhost:8000/mi-proyecto/`.

## Nota

Se ha corregido un error del código original: al guardar se intentaba usar `step2Num`, pero ese nodo no existía en el HTML y provocaba fallo en tiempo de ejecución.
