#!/usr/bin/env python3
"""Serve a pasta do repositório via HTTPS na rede local.

Necessário porque service workers (e portanto o caminho offline da PWA)
exigem secure context. Em LAN HTTP normal (http://192.168.x.x), o SW
não regista no tablet — só `localhost`/`127.0.0.1` ou HTTPS contam.

Este script gera um certificado self-signed na 1.ª execução, depois
serve a pasta na porta 8443 via HTTPS, ouvindo em todas as interfaces.

No tablet, ao abrir https://<ip-pc>:8443/index.html aparece um
warning "ligação não segura" (cert não-trusted). Toca em "Avançadas"
→ "Continuar para o site (não seguro)" — isto acontece UMA vez. A
partir daí o Chrome lembra-se e o SW regista normalmente.

Uso:
    python tools/serve_https.py

Requer Python 3.6+. Para gerar o cert prefere o módulo `cryptography`
(já vem em Anaconda; senão `pip install cryptography`); como fallback
usa `openssl` no PATH.
"""
import http.server
import os
import pathlib
import socket
import socketserver
import ssl
import subprocess
import sys

PORT = 8443
CERT_DIR = pathlib.Path(__file__).parent / ".https_cert"
CERT_FILE = CERT_DIR / "cert.pem"
KEY_FILE = CERT_DIR / "key.pem"


def get_local_ip():
    """Devolve o IP da interface LAN principal."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Não abre conexão real, só usa para descobrir o IP de saída.
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def _generate_cert_with_cryptography(ip):
    """Gera cert via Python `cryptography` — caminho preferido, sem deps externas."""
    import ipaddress
    from datetime import datetime, timedelta, timezone
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "jogos-da-coruja-local")])
    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName([
                x509.IPAddress(ipaddress.ip_address(ip)),
                x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
                x509.DNSName("localhost"),
            ]),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )
    KEY_FILE.write_bytes(key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ))
    CERT_FILE.write_bytes(cert.public_bytes(serialization.Encoding.PEM))


def _generate_cert_with_openssl(ip):
    """Fallback: openssl CLI. Em Anaconda no Windows o openssl pode falhar a
    abrir o openssl.cnf padrão; passamos um config minimal nosso para evitar."""
    config_file = CERT_DIR / "openssl.cnf"
    config_file.write_text(
        "[req]\n"
        "distinguished_name = req_dn\n"
        "prompt = no\n"
        "[req_dn]\n"
        "CN = jogos-da-coruja-local\n",
        encoding="utf-8",
    )
    subprocess.run(
        [
            "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
            "-keyout", str(KEY_FILE), "-out", str(CERT_FILE),
            "-days", "365",
            "-config", str(config_file),
            "-addext", f"subjectAltName=IP:{ip},IP:127.0.0.1,DNS:localhost",
        ],
        check=True,
    )


def ensure_cert():
    """Gera cert.pem + key.pem self-signed na 1.ª execução."""
    if CERT_FILE.exists() and KEY_FILE.exists():
        return
    CERT_DIR.mkdir(parents=True, exist_ok=True)
    ip = get_local_ip()
    print(f"A gerar certificado self-signed (válido 365 dias) para IP {ip}...")
    try:
        import cryptography  # noqa: F401
        _generate_cert_with_cryptography(ip)
        print("(via Python 'cryptography')")
    except ImportError:
        print("Módulo 'cryptography' não disponível — fallback para openssl CLI.")
        try:
            _generate_cert_with_openssl(ip)
            print("(via openssl CLI)")
        except FileNotFoundError:
            print(
                "ERRO: nem 'cryptography' (Python) nem 'openssl' (CLI) disponíveis.\n"
                "Resolução:\n"
                "  pip install cryptography\n"
                "ou usa a alternativa via chrome://flags (ver README,\n"
                "secção 'Alternativa sem HTTPS').",
                file=sys.stderr,
            )
            sys.exit(1)
    print(f"Cert gerado em: {CERT_FILE}")


def serve():
    ensure_cert()
    # Servir a partir do root do repositório (parent da pasta tools/).
    repo_root = pathlib.Path(__file__).parent.parent.resolve()
    os.chdir(repo_root)

    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("0.0.0.0", PORT), handler)

    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=str(CERT_FILE), keyfile=str(KEY_FILE))
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

    ip = get_local_ip()
    bar = "=" * 60
    print(f"\n{bar}")
    print(f"  Servidor HTTPS pronto na porta {PORT}")
    print(f"{bar}")
    print(f"  PC:     https://localhost:{PORT}/index.html")
    print(f"  Tablet: https://{ip}:{PORT}/index.html")
    print(f"{bar}")
    print(f"  No tablet (mesma rede WiFi):")
    print(f"    1. Abre o URL acima em Chrome.")
    print(f"    2. 'Aviso de privacidade' → 'Avançadas' → 'Continuar...'.")
    print(f"    3. Joga 1 exercício (espera 5s para o SW cachear).")
    print(f"    4. Menu Chrome ⋮ → 'Adicionar ao ecrã principal'.")
    print(f"  Ctrl+C para parar.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado.")
        httpd.server_close()


if __name__ == "__main__":
    serve()
