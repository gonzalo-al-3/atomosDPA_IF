# ¡Átomos a la vista! ⚛️✨

**¡Átomos a la vista!** es una aplicación web interactiva desarrollada para el evento **Día de Puertas Abiertas 2026** del **Instituto de Física de la UNAM (IF-UNAM)**.

El objetivo de esta herramienta es acercar la ciencia al público general y a la comunidad académica mediante la visualización interactiva en 3D y Realidad Aumentada (RA) de diversos sistemas atómicos y moleculares: desde pequeñas moléculas orgánicas hasta superficies, fragmentos cristalinos, nanopartículas y biomoléculas.

---

## 🚀 Tecnologías utilizadas

* **Framework Web:** React + TypeScript (impulsado por [Vite](https://vitejs.dev/))
* **Visualización 3D:** Three.js / React Three Fiber
* **Despliegue:** GitHub Pages (automatizado vía GitHub Actions)

---

## 💻 Configuración e Instalación Local

Para ejecutar el proyecto en tu computadora local necesitas tener instalado **Node.js** (versión 18 o superior).

1. Abre tu terminal y ejecuta la aplicación en modo de desarrollo:
```bash
npm install
npm run dev

```


2. Abre en tu navegador la dirección local indicada en la terminal (por lo general `http://localhost:5173/`).

### 🖐️ Control por gestos de mano (cámara)

El modo Kiosco usa MediaPipe para seguir la mano con la cámara web. Los archivos pesados (~45 MB: modelo y WASM) **no se guardan en git**; se preparan automáticamente:

* `npm install` y luego `npm run dev` (o `npm run build`) ejecutan `npm run setup:hand-tracking` por ti. Ese script copia los WASM desde `node_modules` a `public/mediapipe-wasm/` y descarga una vez `public/models/hand_landmarker.task`. **Necesita internet la primera vez.**
* Si la descarga falla, baja el modelo manualmente de `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` y guárdalo en `public/models/hand_landmarker.task`.
* No agregues esos archivos a git (están en `.gitignore`). Si actualizas `@mediapipe/tasks-vision`, vuelve a correr `npm run setup:hand-tracking` para que el WASM coincida con la versión.
* La cámara solo se enciende al pulsar **Activar cámara**. Requiere `https` o `localhost` y permiso del navegador.

---

## 💡 ¿Cómo proponer ideas o reportar errores? (Gestión de Issues)

Si eres colaborador del proyecto y tienes una idea, encuentras un error o quieres agregar un modelo 3D pero **no sabes cómo programarlo**, la mejor herramienta es abrir un **Issue**.

### ¿Qué es un Issue?

Un *Issue* (o Incidencia) es una nota de trabajo o discusión dentro de GitHub. Nos sirve para organizar las tareas del proyecto de forma transparente.

### Úsalo para:

* **Proponer contenido educativo:** *"Sugerencia: Agregar información sobre la estructura de la aspirina"*.
* **Solicitar un nuevo modelo:** *"Sugerencia: Incluir un modelo 3D de la red del grafeno"*.
* **Reportar fallas:** *"Falla: El botón de rotación no responde en dispositivos móviles"*.

### Pasos para abrir un Issue:

1. Ve a la pestaña **Issues** en la parte superior del repositorio principal.
2. Haz clic en el botón verde **New issue**.
3. Escribe un título claro y una descripción detallada de tu propuesta o problema.
4. Haz clic en **Submit new issue**. El equipo podrá discutir la propuesta y asignarla a alguien para implementarla.

---

## 🛠️ Guía de Contribución al Código (Flujo de Trabajo)

Si vas a agregar código, modificar estilos o integrar nuevos modelos 3D, sigue este flujo de trabajo paso a paso:

```text
[ Repo Principal ] ---> (1. Fork) ---> [ Tu Repo GitHub ]
                                            |
                                       (2. Clone)
                                            v
                                    [ Tu Computadora ]
                                            |
                                     (3. Crear Rama)
                                     (4. Probar Cambios)
                                     (5. Commit & Push)
                                            v
[ Repo Principal ] <--- (6. Pull Request) <-- [ Tu Repo GitHub ]

```

### Paso 1: Crear un Fork

Un *Fork* es una copia personal de este repositorio en tu propia cuenta de GitHub.

1. En la página del repositorio principal, haz clic en el botón **Fork** (arriba a la derecha).
2. Guarda el repositorio en tu cuenta personal.

### Paso 2: Crear una copia local (Clone)

Descarga tu *Fork* a tu computadora desde la terminal:

```bash
git clone https://github.com/TU-USUARIO/atomosDPA_IF.git
cd atomosDPA_IF
npm install

```

### Paso 3: Crear una Rama (*Branch*)

**Nunca trabajes directamente en la rama `main`.** Crea una rama específica para la tarea que vas a realizar:

```bash
git checkout -b mi-nueva-funcion

```

*(Ejemplo de nombres de ramas: `agregar-grafeno`, `corregir-estilos-panel`, `actualizar-textos`).*

### Paso 4: Realizar cambios y probar localmente

Inicia el servidor local y haz las modificaciones necesarias:

```bash
npm run dev

```

Verifica en tu navegador que todo funcione correctamente y no haya errores en la consola.

### Paso 5: Guardar cambios y subirlos a tu Fork (*Push*)

Una vez que estés conforme con tus cambios, guárdalos con Git:

```bash
# 1. Seleccionar los archivos modificados
git add .

# 2. Guardar un mensaje descriptivo de lo que hiciste
git commit -m "feat: se agrega la descripción educativa del grafeno"

# 3. Subir la rama a tu Fork en GitHub
git push origin mi-nueva-funcion

```

### Paso 6: Crear un Pull Request (PR)

1. Ve a tu repositorio en GitHub. Verás un aviso que dice *"Compare & pull request"*.
2. Haz clic en ese botón.
3. Describe brevemente los cambios que realizaste y a qué *Issue* responde (si aplica).
4. Envía el **Pull Request**. El administrador del proyecto revisará tus cambios, los probará y los integrará a la página principal.

---

## 🏛️ Créditos e Institución

Proyecto creado para la divulgación científica en el **Instituto de Física de la UNAM (IF-UNAM)** para el evento **Día de Puertas Abiertas 2026**.
