import os
import requests
import json
from dotenv import load_dotenv

# Carrega variáveis do arquivo .env
load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
NOTION_VERSION = "2022-06-28"

headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION
}

def check_connection():
    url = "https://api.notion.com/v1/search"
    payload = {"page_size": 10}
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        results = data.get("results", [])
        if not results:
            print("Conexão bem-sucedida, mas nenhuma página ou banco de dados foi encontrado.")
            print("Certifique-se de que você adicionou a conexão na página do Notion (Add Connections).")
        else:
            print(f"Sucesso! Encontrei {len(results)} itens acessíveis:")
            for item in results:
                title = "Sem título"
                if item["object"] == "page":
                    # Tenta pegar o título de uma página
                    properties = item.get("properties", {})
                    for prop in properties.values():
                        if prop["type"] == "title":
                            title_list = prop.get("title", [])
                            if title_list:
                                title = title_list[0].get("plain_text", title)
                elif item["object"] == "database":
                    title_list = item.get("title", [])
                    if title_list:
                        title = title_list[0].get("plain_text", title)
                
                print(f"- [{item['object'].capitalize()}] {title} (ID: {item['id']})")
    else:
        print(f"Erro ao conectar: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    check_connection()
