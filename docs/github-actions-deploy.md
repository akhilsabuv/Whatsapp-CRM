# GitHub Actions Deployment

This repo deploys from GitHub Actions through `.github/workflows/deploy.yml`.

The workflow runs when `main` is pushed, and can also be started manually from the GitHub Actions tab. It SSHes into the Ubuntu server, pulls `origin/main` in `/opt/whatsapp-crm`, and runs:

```bash
docker compose up -d --build --remove-orphans
```

## Required GitHub Secrets

Add these in GitHub: `Settings` -> `Secrets and variables` -> `Actions`.

Repository secrets:

- `SSH_HOST`: `91.108.104.158`
- `SSH_USER`: server SSH username, currently `root`
- `SSH_PRIVATE_KEY`: private key for a key authorized on the server

Repository variables:

- `SSH_PORT`: `22`
- `DEPLOY_PATH`: `/opt/whatsapp-crm`

## Create the SSH Key

Run this on your own computer:

```bash
ssh-keygen -t ed25519 -C "github-actions-crm-deploy" -f github-actions-crm-deploy
```

Add the public key to the server:

```bash
ssh root@91.108.104.158 "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
cat github-actions-crm-deploy.pub | ssh root@91.108.104.158 "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Then put the full contents of `github-actions-crm-deploy` into the `SSH_PRIVATE_KEY` GitHub secret.
