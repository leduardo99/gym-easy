# ADR 0003: Autenticação própria

- Estado: Aceite
- Data: 2026-10-15

## Contexto
A app precisa de email + password, de confirmação e de dados de saúde sob controlo próprio.

## Decisão
argon2id (`@node-rs/argon2`), sessões opacas com hash em BD, cookies HttpOnly, rate limit em BD e verificação HIBP.

## Consequências
Controlo total e nenhuma dependência de um IdP, mas a manutenção de segurança é nossa e exige revisão da Delta.
