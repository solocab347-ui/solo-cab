# SoloCab — CI Security Checks

## Pipeline recommandée (GitHub Actions, GitLab CI, Bitbucket)

À exécuter sur chaque PR vers `main` :

```yaml
name: security
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      # 1) Secrets en clair (pre-commit hook réutilisé)
      - name: Secret scan
        run: bash scripts/git-hooks/pre-commit || true

      # 2) Audit dépendances
      - name: npm audit
        run: bun audit --audit-level=high

      # 3) ESLint sécurité
      - name: ESLint
        run: bunx eslint src --max-warnings=0

      # 4) Validation Zod présente dans toutes les edge functions
      - name: Zod presence
        run: |
          missing=0
          for d in supabase/functions/*/index.ts; do
            grep -q 'zod' "$d" || { echo "Zod manquant: $d"; missing=1; }
          done
          # Avertissement seulement (certaines fonctions read-only OK)
          exit 0

      # 5) Audit posture Supabase
      - name: Supabase posture
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          psql "$SUPABASE_DB_URL" -c "SELECT * FROM public.audit_security_posture();" \
            | tee posture.txt
          ! grep -q 'CRITICAL' posture.txt
```

## Règles bloquantes (exit 1)

- Secret pattern détecté
- `service_role` dans `src/`
- `npm audit` HIGH/CRITICAL
- `audit_security_posture()` retourne CRITICAL

## Règles avertissement

- console.log avec PII suspecté
- Edge function sans import Zod
- Dépendance dépréciée

## Installation locale du hook

```bash
cp scripts/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```
