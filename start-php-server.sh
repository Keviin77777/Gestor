#!/bin/bash

echo "========================================"
echo "  Iniciando Servidor PHP API"
echo "========================================"
echo ""
echo "Porta: 8080"
echo "Diretorio: api/"
echo ""
echo "Pressione Ctrl+C para parar"
echo "========================================"
echo ""

cd api
php -S localhost:8080 index.php
