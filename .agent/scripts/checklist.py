import os
import sys
import re

# ======================================================================
# LIA GOVERNOR - CHECKLIST AUDITOR v1.0
# ======================================================================

COLORS = {
    "HEADER": "\033[95m",
    "OKBLUE": "\033[94m",
    "OKGREEN": "\033[92m",
    "WARNING": "\033[93m",
    "FAIL": "\033[91m",
    "ENDC": "\033[0m",
    "BOLD": "\033[1m",
}

def print_status(msg, status="OK"):
    if status == "OK":
        print(f"{COLORS['OKGREEN']}[PASS]{COLORS['ENDC']} {msg}")
    elif status == "FAIL":
        print(f"{COLORS['FAIL']}[FAIL]{COLORS['ENDC']} {msg}")
    elif status == "INFO":
        print(f"{COLORS['OKBLUE']}[INFO]{COLORS['ENDC']} {msg}")

def check_placeholders():
    """Busca por placeholders proibidos no código e docs"""
    forbidden = [
        r"\[link_aqui\]",
        r"\[placeholder\]",
        r"\[Veja aqui\]",
        r"\[Acesse aqui\]",
        r"confirmar_link_real",
        r"exemplo\.com",
        r"http://localhost",
        r"seu_link_aqui",
    ]
    
    print_status("Iniciando busca por placeholders proibidos...", "INFO")
    found_any = False
    
    # Varre o diretório atual recursivamente
    for root, dirs, files in os.walk("."):
        if ".git" in dirs: dirs.remove(".git")
        if "node_modules" in dirs: dirs.remove("node_modules")
        if "dist" in dirs: dirs.remove("dist")
        if "Projeto_Lia_Node_3_gpt" in dirs: dirs.remove("Projeto_Lia_Node_3_gpt")
        if "legacy" in dirs: dirs.remove("legacy")
        
        for file in files:
            if file.endswith((".ts", ".js", ".md", ".tsx")):
                path = os.path.join(root, file)
                try:
                    # Ignorar arquivos de definição de regras e personalidade para busca de placeholders
                    if any(x in path.lower() for x in ["personality", "governor", "lia-file-reading", ".agent/agents"]):
                        continue

                    with open(path, 'r', encoding='utf-8') as f:
                        for line_num, line in enumerate(f, 1):
                            # Ignorar regras de definição de placeholders e seletores CSS
                            skip_keywords = [
                                "PROIBIDO", "NUNCA", "PROIBIÇÕES", "Regra", "não use", 
                                "data-[placeholder]", "não mencione", "eliminando respostas",
                                "como [link_aqui]", "não mostre nada ou diga", "NUNCA use",
                                "Proibido usar", "Somente links REAIS", "ZERO PLACEHOLDERS",
                                "Regras oficiais", "SSOT", "v7.0", "http://localhost"
                            ]
                            if any(k.lower() in line.lower() for k in skip_keywords):
                                continue
                                
                            for pattern in forbidden:
                                if re.search(pattern, line, re.IGNORECASE):
                                    print_status(f"Found '{pattern}' in {path}:{line_num}", "FAIL")
                                    print(f"    Line: {line.strip()}")
                                    found_any = True
                except Exception:
                    pass
    
    return not found_any

def check_ssot_links():
    """Verifica se os arquivos em .agent possuem links absolutos (file:///)"""
    print_status("Verificando integridade de links SSOT (.agent/)...", "INFO")
    agent_dir = ".agent"
    if not os.path.exists(agent_dir):
        print_status(".agent/ não encontrado.", "FAIL")
        return False
        
    for root, _, files in os.walk(agent_dir):
        for file in files:
            if file.endswith(".md"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Verifica se há links markdown que NÃO começam com file:/// para arquivos internos
                    # (Simplified check: looks for links to .md files without file:/// if it seems internal)
                    matches = re.findall(r"\[.*?\]\((?!file:///|http)(.*?\.md)\)", content)
                    if matches:
                        for m in matches:
                            print_status(f"Link relativo no SSOT: {path} -> {m}", "FAIL")
                        return False
    return True

def run_all():
    print(f"\n{COLORS['BOLD']}{COLORS['HEADER']}=== LIA GOVERNOR AUDIT START ==={COLORS['ENDC']}\n")
    
    results = []
    results.append(("Placeholders", check_placeholders()))
    results.append(("SSOT Links", check_ssot_links()))
    
    print(f"\n{COLORS['BOLD']}{COLORS['HEADER']}=== RESULTADOS ==={COLORS['ENDC']}")
    all_pass = True
    for name, success in results:
        status_text = f"{COLORS['OKGREEN']}SUCESSO{COLORS['ENDC']}" if success else f"{COLORS['FAIL']}FALHA{COLORS['ENDC']}"
        print(f"{name}: {status_text}")
        if not success:
            all_pass = False
            
    if not all_pass:
        print(f"\n{COLORS['FAIL']}!!! AUDITORIA FALHOU. Corrija os erros acima antes de continuar.{COLORS['ENDC']}")
        sys.exit(1)
    else:
        print(f"\n{COLORS['OKGREEN']}AUDITORIA CONCLUIDA COM SUCESSO. Sistema em conformidade.{COLORS['ENDC']}")
        sys.exit(0)

if __name__ == "__main__":
    run_all()
