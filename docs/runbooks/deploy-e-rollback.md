# Deploy e rollback (Coolify)

1. Merge em `main` → CI verde → workflow `deploy-coolify.yml` dispara o deploy.
2. O Coolify constrói a imagem **linux/arm64**; o arranque aplica as migrações (`RUN_MIGRATIONS=true`).
3. Verificar: healthcheck verde, `GET /api/health` 200, login de teste e logs sem erros.
   **Rollback:** no Coolify, voltar a fazer deploy da imagem anterior. Se houve migração, só se faz rollback de código compatível com o schema novo. Migrações destrutivas exigem uma migração de reversão própria (ver RFC).
