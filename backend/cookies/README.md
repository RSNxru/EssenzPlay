# 🍪 Cookies de tu cuenta real (para contenido +18 / con login)

> No falsifiques una cuenta. Usa **tu propia sesión de Google**, donde tu fecha de
> nacimiento real ya te acredita como adulto. Así YouTube te sirve el contenido con
> restricción de edad porque te identificas, no porque engañes al sistema.

## Cómo exportar tus cookies (Chrome/Edge usan App-Bound Encryption, por eso se hace con extensión)

1. Inicia sesión en YouTube con tu cuenta en el navegador.
2. Instala la extensión **"Get cookies.txt LOCALLY"** (Chrome/Edge/Firefox).
3. Estando en `youtube.com`, exporta en **formato Netscape**.
4. Guarda el archivo aquí como **`backend/cookies/cookies.txt`**.
5. Reinicia el backend:
   ```bash
   docker compose restart backend
   ```

Listo. El backend detecta el archivo automáticamente (`COOKIES_FILE=/cookies/cookies.txt`)
y lo usa para todas las extracciones y descargas. Si el archivo no está, se ignora sin error.

⚠️ `cookies.txt` está en `.gitignore` — nunca se sube al repo (es tu sesión privada).
