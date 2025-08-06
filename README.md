# Envia-PDF-WhatsApp-prototipo
## Descrição
Este projeto permite o envio de PDFs para números do WhatsApp usando a API Infobip. Ele inclui:
- Armazenamento do PDF e geração de um link público.
- Integração com a API Infobip para envio de mensagens predefinidas.
Envia-PDF-WhatsApp — Homologação

Este documento descreve as instruções para subir e rodar o projeto Envia-PDF-WhatsApp em ambiente de homologação.

1. Pré-requisitos

Conta GitLab com permissão de CI/CD
Chave SSH de deploy configurada no servidor de homologação
Acesso ao Container Registry do GitLab

2. Configurar Variáveis de CI/CD
No GitLab, acesse Settings → CI/CD → Variables e defina:
Variável
Descrição
CI_REGISTRY_USER
Usuário do Container Registry
CI_REGISTRY_PASSWORD
Token ou senha do Container Registry
SSH_PRIVATE_KEY_DEPLOYER
Chave SSH privada para deploy no servidor de homologação
DEPLOY_USER
Usuário SSH no host de homologação
DEPLOY_HOST
Host de homologação (ex.: homoinhambupe.tre-ba.jus.br)

3. Criar Branch de Homologação
Crie uma branch com prefixo homo-:
git checkout -b homo-ajuste-homolog

Faça commit e push:
git add .
git commit -m "Ajustes para homologação"
git push origin homo-ajuste-homolog

Branches iniciadas por homo- disparam o pipeline de homologação.

4. Pipeline CI/CD
O pipeline configurado em .gitlab-ci.yml executa automaticamente os seguintes estágios para qualquer branch homo-*:

build_back
Compila o backend usando Maven e gera a imagem Docker.
Faz push da imagem para o Container Registry.
deploy_back
Conecta via SSH ao servidor de homologação.
Pull da nova imagem backend.
Remove e recria o container envia-pdf-whatsapp-backend na porta 5020.
build_front
Executa npm ci e compila o Angular em modo produção.
Build e push da imagem Docker do frontend.
deploy_front
SSH no servidor de homologação.
Pull da nova imagem frontend.
Remove e recria o container envia-pdf-whatsapp-frontend na porta 5021.

Você pode acompanhar o status dos estágios em CI/CD → Pipelines no GitLab.

5. Verificação Pós-Deploy
Após a execução bem-sucedida do pipeline:

Health do Backend
Acesse:
http://<DEPLOY_HOST>:5020/actuator/health

Aplicação Frontend
Abra no navegador:
http://<DEPLOY_HOST>:5021

Teste o envio de PDFs e confirme no storage.

Storage de PDFs
No servidor de homologação, verifique a existência dos arquivos em:
/var/www/pdf-files

Logs no Banco
No Oracle de homologação, confira a tabela PDF_ENVIOS para os registros de envio.