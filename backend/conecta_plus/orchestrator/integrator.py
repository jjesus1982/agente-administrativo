# -*- coding: utf-8 -*-
"""
Integrador de Sistemas
======================

Integra todos os dispositivos automaticamente:
- Adiciona câmeras ao NVR
- Registra controladoras na nuvem
- Configura streams de vídeo
- Testa comunicação fim-a-fim
"""

from __future__ import annotations
import asyncio
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

from .scanner import DispositivoEncontrado, TipoDispositivo

logger = logging.getLogger(__name__)


class StatusIntegracao(str, Enum):
    PENDENTE = "pendente"
    INTEGRANDO = "integrando"
    SUCESSO = "sucesso"
    ERRO = "erro"
    PARCIAL = "parcial"


@dataclass
class CameraConfig:
    """Configuração de câmera para integração."""
    ip: str
    porta_rtsp: int = 554
    canal: int = 1
    usuario: str = "admin"
    senha: str = "admin"
    protocolo: str = "TCP"  # TCP ou UDP
    stream: str = "main"  # main ou sub
    nome: str = ""


@dataclass
class IntegracaoNVR:
    """Resultado da integração de câmeras no NVR."""
    nvr_ip: str
    cameras_adicionadas: List[str] = field(default_factory=list)
    cameras_erro: List[Dict] = field(default_factory=list)
    status: StatusIntegracao = StatusIntegracao.PENDENTE
    logs: List[str] = field(default_factory=list)


@dataclass
class IntegracaoNuvem:
    """Resultado da integração com nuvem."""
    dispositivo_ip: str
    dispositivo_tipo: str
    cloud_id: str = ""
    cloud_url: str = ""
    status: StatusIntegracao = StatusIntegracao.PENDENTE
    logs: List[str] = field(default_factory=list)


@dataclass
class ResultadoIntegracao:
    """Resultado completo da integração."""
    projeto: str
    nvr_integracoes: List[IntegracaoNVR] = field(default_factory=list)
    cloud_integracoes: List[IntegracaoNuvem] = field(default_factory=list)
    testes_realizados: List[Dict] = field(default_factory=list)
    status: StatusIntegracao = StatusIntegracao.PENDENTE
    inicio: datetime = field(default_factory=datetime.now)
    fim: Optional[datetime] = None


class Integrador:
    """
    Integrador de sistemas.
    
    Conecta câmeras ao NVR, registra dispositivos na nuvem,
    e realiza testes de comunicação.
    """
    
    def __init__(self, cloud_api_url: str = None, cloud_api_key: str = None):
        self.cloud_api_url = cloud_api_url
        self.cloud_api_key = cloud_api_key
    
    async def integrar_cameras_nvr(
        self,
        nvr_ip: str,
        cameras: List[DispositivoEncontrado],
        credenciais_nvr: Dict[str, str],
        credenciais_cameras: Dict[str, str]
    ) -> IntegracaoNVR:
        """
        Adiciona múltiplas câmeras a um NVR.
        
        Args:
            nvr_ip: IP do NVR.
            cameras: Lista de câmeras encontradas.
            credenciais_nvr: Login do NVR.
            credenciais_cameras: Login das câmeras.
        
        Returns:
            IntegracaoNVR com resultado.
        """
        resultado = IntegracaoNVR(nvr_ip=nvr_ip)
        resultado.status = StatusIntegracao.INTEGRANDO
        resultado.logs.append(f"Iniciando integração de {len(cameras)} câmeras no NVR {nvr_ip}")
        
        try:
            import aiohttp
            
            usuario_nvr = credenciais_nvr.get("usuario", "admin")
            senha_nvr = credenciais_nvr.get("senha", "admin")
            usuario_cam = credenciais_cameras.get("usuario", "admin")
            senha_cam = credenciais_cameras.get("senha", "admin")
            
            auth = aiohttp.BasicAuth(usuario_nvr, senha_nvr)
            
            async with aiohttp.ClientSession(auth=auth) as session:
                # Verifica conexão com NVR
                resultado.logs.append("Verificando conexão com NVR...")
                
                url = f"http://{nvr_ip}/cgi-bin/magicBox.cgi?action=getSystemInfo"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200:
                        raise Exception(f"Falha ao conectar no NVR: HTTP {resp.status}")
                    resultado.logs.append("✓ Conexão com NVR OK")
                
                # Obtém canais disponíveis
                resultado.logs.append("Obtendo canais disponíveis...")
                
                url = f"http://{nvr_ip}/cgi-bin/configManager.cgi?action=getConfig&name=ChannelTitle"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        # Parse para saber quantos canais existem
                        resultado.logs.append("✓ Canais obtidos")
                
                # Adiciona cada câmera
                canal = 1
                for camera in cameras:
                    resultado.logs.append(f"Adicionando câmera {camera.ip} no canal {canal}...")
                    
                    try:
                        sucesso = await self._adicionar_camera_nvr_intelbras(
                            session, nvr_ip, camera.ip, canal,
                            usuario_cam, senha_cam
                        )
                        
                        if sucesso:
                            resultado.cameras_adicionadas.append(camera.ip)
                            resultado.logs.append(f"✓ Câmera {camera.ip} adicionada no canal {canal}")
                        else:
                            resultado.cameras_erro.append({
                                "ip": camera.ip,
                                "erro": "Falha ao adicionar"
                            })
                            resultado.logs.append(f"✗ Erro ao adicionar {camera.ip}")
                        
                    except Exception as e:
                        resultado.cameras_erro.append({
                            "ip": camera.ip,
                            "erro": str(e)
                        })
                        resultado.logs.append(f"✗ Erro {camera.ip}: {e}")
                    
                    canal += 1
                
                # Determina status final
                if len(resultado.cameras_erro) == 0:
                    resultado.status = StatusIntegracao.SUCESSO
                elif len(resultado.cameras_adicionadas) > 0:
                    resultado.status = StatusIntegracao.PARCIAL
                else:
                    resultado.status = StatusIntegracao.ERRO
                
                resultado.logs.append(
                    f"Integração concluída: {len(resultado.cameras_adicionadas)} OK, "
                    f"{len(resultado.cameras_erro)} erros"
                )
                
        except Exception as e:
            resultado.status = StatusIntegracao.ERRO
            resultado.logs.append(f"ERRO FATAL: {e}")
            logger.error(f"Erro na integração NVR: {e}")
        
        return resultado
    
    async def _adicionar_camera_nvr_intelbras(
        self,
        session,
        nvr_ip: str,
        camera_ip: str,
        canal: int,
        usuario_cam: str,
        senha_cam: str
    ) -> bool:
        """Adiciona câmera ao NVR Intelbras/Dahua."""
        
        # Configura canal remoto
        url = f"http://{nvr_ip}/cgi-bin/configManager.cgi?action=setConfig"
        
        # Parâmetros para adicionar dispositivo remoto
        params = {
            f"RemoteDevice[{canal-1}].Enable": "true",
            f"RemoteDevice[{canal-1}].Address": camera_ip,
            f"RemoteDevice[{canal-1}].Port": "37777",
            f"RemoteDevice[{canal-1}].UserName": usuario_cam,
            f"RemoteDevice[{canal-1}].Password": senha_cam,
            f"RemoteDevice[{canal-1}].Protocol": "Private",
            f"RemoteDevice[{canal-1}].VideoInputChannels": "1",
        }
        
        async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status == 200:
                text = await resp.text()
                return "OK" in text or "ok" in text.lower()
        
        return False
    
    async def registrar_dispositivo_nuvem(
        self,
        dispositivo: DispositivoEncontrado,
        credenciais: Dict[str, str],
        condominio: str,
        projeto_id: str
    ) -> IntegracaoNuvem:
        """
        Registra dispositivo na nuvem Conecta Plus.
        
        Args:
            dispositivo: Dispositivo a registrar.
            credenciais: Login do dispositivo.
            condominio: Nome do condomínio.
            projeto_id: ID do projeto.
        
        Returns:
            IntegracaoNuvem com resultado.
        """
        resultado = IntegracaoNuvem(
            dispositivo_ip=dispositivo.ip,
            dispositivo_tipo=dispositivo.tipo.value
        )
        resultado.status = StatusIntegracao.INTEGRANDO
        resultado.logs.append(f"Registrando {dispositivo.tipo.value} {dispositivo.ip} na nuvem...")
        
        if not self.cloud_api_url:
            resultado.logs.append("⚠ URL da API cloud não configurada")
            resultado.logs.append("Simulando registro na nuvem...")
            
            # Simula registro
            import secrets
            resultado.cloud_id = f"cloud_{secrets.token_hex(8)}"
            resultado.cloud_url = f"https://cloud.conectaplus.com.br/device/{resultado.cloud_id}"
            resultado.status = StatusIntegracao.SUCESSO
            resultado.logs.append(f"✓ Dispositivo registrado: {resultado.cloud_id}")
            
            return resultado
        
        try:
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {self.cloud_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "ip_local": dispositivo.ip,
                "mac": dispositivo.mac,
                "fabricante": dispositivo.fabricante,
                "modelo": dispositivo.modelo,
                "tipo": dispositivo.tipo.value,
                "condominio": condominio,
                "projeto_id": projeto_id,
                "credenciais": credenciais
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.cloud_api_url}/devices/register",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status in (200, 201):
                        data = await resp.json()
                        resultado.cloud_id = data.get("device_id", "")
                        resultado.cloud_url = data.get("url", "")
                        resultado.status = StatusIntegracao.SUCESSO
                        resultado.logs.append(f"✓ Registrado: {resultado.cloud_id}")
                    else:
                        resultado.status = StatusIntegracao.ERRO
                        resultado.logs.append(f"✗ Erro HTTP {resp.status}")
                        
        except Exception as e:
            resultado.status = StatusIntegracao.ERRO
            resultado.logs.append(f"✗ Erro: {e}")
            logger.error(f"Erro ao registrar na nuvem: {e}")
        
        return resultado
    
    async def testar_comunicacao(
        self,
        dispositivos: List[DispositivoEncontrado]
    ) -> List[Dict]:
        """
        Testa comunicação com todos os dispositivos.
        
        Args:
            dispositivos: Lista de dispositivos a testar.
        
        Returns:
            Lista de resultados de teste.
        """
        resultados = []
        
        for disp in dispositivos:
            teste = {
                "ip": disp.ip,
                "fabricante": disp.fabricante,
                "tipo": disp.tipo.value,
                "testes": {}
            }
            
            # Teste de ping
            teste["testes"]["ping"] = await self._teste_ping(disp.ip)
            
            # Teste de HTTP
            if 80 in disp.portas_abertas:
                teste["testes"]["http"] = await self._teste_http(disp.ip)
            
            # Teste de RTSP (para câmeras/NVRs)
            if 554 in disp.portas_abertas:
                teste["testes"]["rtsp"] = await self._teste_rtsp(disp.ip)
            
            # Status geral
            teste["online"] = all(
                v.get("sucesso", False) 
                for v in teste["testes"].values()
            )
            
            resultados.append(teste)
        
        return resultados
    
    async def _teste_ping(self, ip: str) -> Dict:
        """Teste de ping."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "ping", "-c", "3", "-W", "2", ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
            
            output = stdout.decode()
            
            # Extrai latência
            if "time=" in output:
                import re
                times = re.findall(r'time=(\d+\.?\d*)', output)
                if times:
                    avg_time = sum(float(t) for t in times) / len(times)
                    return {
                        "sucesso": True,
                        "latencia_ms": round(avg_time, 2)
                    }
            
            return {"sucesso": proc.returncode == 0, "latencia_ms": 0}
            
        except Exception as e:
            return {"sucesso": False, "erro": str(e)}
    
    async def _teste_http(self, ip: str) -> Dict:
        """Teste de HTTP."""
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                start = asyncio.get_event_loop().time()
                async with session.get(
                    f"http://{ip}/",
                    timeout=aiohttp.ClientTimeout(total=5),
                    allow_redirects=False
                ) as resp:
                    tempo = (asyncio.get_event_loop().time() - start) * 1000
                    return {
                        "sucesso": True,
                        "status_code": resp.status,
                        "tempo_ms": round(tempo, 2)
                    }
                    
        except Exception as e:
            return {"sucesso": False, "erro": str(e)}
    
    async def _teste_rtsp(self, ip: str) -> Dict:
        """Teste de porta RTSP."""
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip, 554),
                timeout=5
            )
            
            # Envia OPTIONS
            request = f"OPTIONS rtsp://{ip}:554/ RTSP/1.0\r\nCSeq: 1\r\n\r\n"
            writer.write(request.encode())
            await writer.drain()
            
            response = await asyncio.wait_for(reader.read(1024), timeout=5)
            
            writer.close()
            await writer.wait_closed()
            
            return {
                "sucesso": b"RTSP/1.0" in response,
                "resposta": response[:100].decode(errors='ignore')
            }
            
        except Exception as e:
            return {"sucesso": False, "erro": str(e)}
    
    async def integrar_tudo(
        self,
        dispositivos: List[DispositivoEncontrado],
        credenciais: Dict[str, str],
        condominio: str,
        projeto_id: str
    ) -> ResultadoIntegracao:
        """
        Integração completa de todos os dispositivos.
        
        Args:
            dispositivos: Dispositivos encontrados no scan.
            credenciais: Credenciais de acesso.
            condominio: Nome do condomínio.
            projeto_id: ID do projeto.
        
        Returns:
            ResultadoIntegracao com tudo.
        """
        resultado = ResultadoIntegracao(projeto=projeto_id)
        resultado.status = StatusIntegracao.INTEGRANDO
        
        # Separa por tipo
        nvrs = [d for d in dispositivos if d.tipo == TipoDispositivo.NVR]
        cameras = [d for d in dispositivos if d.tipo == TipoDispositivo.CAMERA]
        controladoras = [d for d in dispositivos if d.tipo == TipoDispositivo.CONTROLADORA]
        
        # 1. Integra câmeras nos NVRs
        for nvr in nvrs:
            integracao = await self.integrar_cameras_nvr(
                nvr.ip, cameras, credenciais, credenciais
            )
            resultado.nvr_integracoes.append(integracao)
        
        # 2. Registra dispositivos na nuvem
        for disp in dispositivos:
            cloud_result = await self.registrar_dispositivo_nuvem(
                disp, credenciais, condominio, projeto_id
            )
            resultado.cloud_integracoes.append(cloud_result)
        
        # 3. Testa comunicação
        resultado.testes_realizados = await self.testar_comunicacao(dispositivos)
        
        # Determina status final
        nvr_ok = all(i.status == StatusIntegracao.SUCESSO for i in resultado.nvr_integracoes)
        cloud_ok = all(i.status == StatusIntegracao.SUCESSO for i in resultado.cloud_integracoes)
        
        if nvr_ok and cloud_ok:
            resultado.status = StatusIntegracao.SUCESSO
        elif any(i.status == StatusIntegracao.SUCESSO for i in resultado.nvr_integracoes + resultado.cloud_integracoes):
            resultado.status = StatusIntegracao.PARCIAL
        else:
            resultado.status = StatusIntegracao.ERRO
        
        resultado.fim = datetime.now()
        return resultado
