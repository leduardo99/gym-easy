if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks is required for the pre-commit hook."
  echo "Install v8.30.1: https://github.com/gitleaks/gitleaks#installing"
  exit 1
fi

gitleaks protect --staged --redact --no-banner --config .gitleaks.toml
