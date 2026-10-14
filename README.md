# SGA para Claude

Conector de **solo lectura** entre Claude y SGA (sga.adventistassureste.org), el sistema de ADOSE.

- Entra con el **usuario de SGA de cada persona** y la base aplica sus mismos permisos: Claude ve lo que esa persona ve en SGA, nada más.
- No puede crear, cambiar ni borrar nada.
- La contraseña no se guarda. Queda solo la sesión, en el Administrador de credenciales de Windows (o el Llavero en Mac).
- Para quitar el acceso: desactivar al usuario o quitarle el permiso en SGA → Gestionar accesos.

Cubre: zonas, distritos, iglesias, organización de iglesias, personal y teléfonos, familiares, puestos, vacaciones, permisos y licencias, y actas de junta, y formularios con sus respuestas (los del módulo Formularios y los de los eventos).

## Dos modalidades

| Modalidad | Qué consulta | Se instala con |
|---|---|---|
| **Completa** | Todo lo anterior | `github:prcontreras23/sga-para-claude` |
| **Directorio** | Zonas, distritos, iglesias (datos básicos), personal con teléfonos y formularios | `github:prcontreras23/sga-para-claude directorio` |

En las dos, lo que la persona ve lo deciden sus permisos en SGA. La modalidad solo limita qué le ofrece Claude.

## Instalación en Windows

1. Instalar **Node.js** (versión LTS) desde https://nodejs.org — siguiente, siguiente, finalizar.
2. Abrir **PowerShell** y entrar a SGA una vez (se abre una página en el navegador; use su correo y contraseña de SGA):

   ```powershell
   npx -y github:prcontreras23/sga-para-claude entrar
   ```

3. Agregar el conector a Claude:

   **Claude Code (terminal):**

   ```powershell
   claude mcp add sga --scope user -- cmd /c npx -y github:prcontreras23/sga-para-claude
   ```

   **Claude Desktop (la aplicación):** Configuración → Desarrollador → Editar configuración, y agregar dentro de `"mcpServers"`:

   ```json
   "sga": {
     "command": "cmd",
     "args": ["/c", "npx", "-y", "github:prcontreras23/sga-para-claude"]
   }
   ```

   Luego cerrar Claude Desktop por completo y volver a abrirlo.

   Para la modalidad **directorio**, agregar `directorio` al final: en Claude Code, `... sga-para-claude directorio`; en Claude Desktop, `"args": ["/c", "npx", "-y", "github:prcontreras23/sga-para-claude", "directorio"]`.

4. Probar en Claude: «¿Con qué usuario estás conectado a SGA?»

## En Mac

```bash
npx -y github:prcontreras23/sga-para-claude entrar
claude mcp add sga --scope user -- npx -y github:prcontreras23/sga-para-claude
```

## Otros comandos

| Comando | Para qué |
|---|---|
| `npx -y github:prcontreras23/sga-para-claude estado` | Ver con qué usuario está conectado |
| `npx -y github:prcontreras23/sga-para-claude salir` | Borrar la sesión de esta computadora |

Si la sesión vence o cambia la contraseña, Claude abre solo la página para volver a entrar.

## Herramientas que ve Claude

| Herramienta | Qué hace |
|---|---|
| `sga_buscar_persona` | Busca personal por nombre, cargo, distrito o zona y da teléfono, extensión y correo |
| `sga_tablas` | Lista las tablas disponibles y sus columnas |
| `sga_consultar` | Consulta una tabla con filtros, orden y límite |
| `sga_quien_soy` | Usuario conectado y sus permisos |
