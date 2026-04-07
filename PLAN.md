# Plan Apicacion Web para Tracking de Pedidos

Estoy creabd una aplicacion web, en la que podré escanear codigos numéricos de 5 cifras a traves de la camara. Un avez los tecga detectados. Tendré que poder guardar cierta infrmacion sobre el codigo.

Cada codigo pertenece a un pedido, y tendreq eu guardar la descripcion del pedido, donde se envia, en que fecha e envia...

## Tecologías usadas

Las tecnologías ue voy a usar en mi proyecto son:
- FrontEnd: React + TypeScript + Vite
- BackEnd: firebase

Dentro del frontend he usado las siguientes estrategias:
- getUserMedia para abrir cámara.
- Capturas un frame del vídeo
- OpenCV.js para limpiar la imagen
- Tesseract.js para leer texto
- Validas con regex: ^\d{5}$
- Guardas en IndexedDB
- Lo empaquetas como PWA