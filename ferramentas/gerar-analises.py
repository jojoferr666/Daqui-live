#!/usr/bin/env python3
"""Gera os boletins de análise (PDF de exemplo, com dados fictícios) de cada produto da Daqui.

Corra a partir da pasta do site:   python3 ferramentas/gerar-analises.py
Precisa da biblioteca reportlab:   pip install reportlab

Cria docs/analises/<id>.pdf para cada produto de js/data.js e o ficheiro js/analises.js,
que a aba "Análises" da página de cada produto usa para mostrar o número e a data do boletim.
Também pode substituir qualquer PDF por um boletim verdadeiro com o mesmo nome.
"""
import re, json, hashlib, pathlib, datetime as dt
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle

SITE = pathlib.Path(__file__).resolve().parent.parent
data = (SITE / 'js' / 'data.js').read_text(encoding='utf-8')
rows = re.findall(r"^prod\('([^']+)','([^']+)','([^']+)','([^']+)',([\d.]+),'([^']+)','([^']+)','([^']+)',\[(\d+),(\d+)\],", data, re.M)
farmers = {m[0]: (m[1], m[2], m[3]) for m in re.findall(r"\{ id:'([^']+)', name:'([^']+)', farm:'([^']+)', place:'([^']+)'", data)}
group_of = dict(re.findall(r"'([a-z0-9-]+)':'([a-z-]+)'", data[data.index('const GROUP_OF'):data.index('};', data.index('const GROUP_OF'))]))

GREEN = colors.HexColor('#3C6104'); GOLD = colors.HexColor('#F2C663'); INK = colors.HexColor('#22380A'); SAGE = colors.HexColor('#EFF2DF')
st = lambda size=9.5, bold=False, color=INK, lead=None: ParagraphStyle('s', fontName='Helvetica-Bold' if bold else 'Helvetica', fontSize=size, leading=lead or size * 1.35, textColor=color)

def rnd(pid, k, lo, hi, dec=3):
    h = int(hashlib.sha256(f'{pid}:{k}'.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
    return round(lo + (hi - lo) * h, dec)

def in_season(month, a, b):
    return a <= month <= b if a <= b else (month >= a or month <= b)

def num(v, dec=3):
    return f'{v:.{dec}f}'.replace('.', ',')

LEAFY_NITRATE = {'alface': 4000, 'alface-romana': 4000, 'alface-iceberg': 2000, 'espinafres': 3500, 'rucula': 7000}
REF_DATE = dt.date(2026, 11, 15)
out_dir = SITE / 'docs' / 'analises'; out_dir.mkdir(parents=True, exist_ok=True)
meta = {}

for i, (pid, cat, pt, en, price, unit, farmer, art, a, b) in enumerate(rows):
    a, b = int(a), int(b); grp = group_of.get(pid, '')
    if in_season(REF_DATE.month, a, b):
        date = dt.date(2026, 11, 5 + int(rnd(pid, 'd', 0, 7, 0)))
    else:
        date = dt.date(2026 if b < 11 else 2025, b, 10)
    number = f'AL-26-{1200 + i * 7:04d}'
    fname, farm, place = farmers.get(farmer, ('', '', ''))
    fruit = cat == 'fruta'
    pb_ref = 0.30 if grp in ('folhas', 'couves', 'ervas') else (0.05 if grp == 'frutos-horticolas' else 0.10)
    cd_ref = 0.10 if grp in ('folhas', 'ervas', 'raizes', 'tuberculos', 'caules') else 0.050
    pb = rnd(pid, 'pb', 0.004, pb_ref * 0.35); cd = rnd(pid, 'cd', 0.002, cd_ref * 0.3)
    results = [
        ['Resíduos de pesticidas\n(pesquisa de 520 substâncias)', 'LC-MS/MS e GC-MS/MS', 'Não detetados\n(< 0,010 mg/kg)', 'LMR por substância', 'Conforme'],
        ['Chumbo (Pb)', 'ICP-MS', f'{num(pb)} mg/kg', f'{num(pb_ref, 2)} mg/kg', 'Conforme'],
        ['Cádmio (Cd)', 'ICP-MS', f'{num(cd)} mg/kg', f'{num(cd_ref, 3)} mg/kg', 'Conforme'],
    ]
    params = ['pesticidas', 'metais']
    if pid in LEAFY_NITRATE:
        ref = LEAFY_NITRATE[pid]; v = int(rnd(pid, 'no3', ref * 0.2, ref * 0.55, 0))
        results.append(['Nitratos (NO3)', 'HPLC', f'{v} mg/kg', f'{ref} mg/kg', 'Conforme']); params.append('nitratos')
    if grp in ('folhas', 'ervas', 'bagas'):
        results.append(['Escherichia coli', 'ISO 16649-2', '< 10 ufc/g', '-', 'Informativo']); params.append('microbiologia')
    if fruit and grp not in ('frutos-secos',):
        brix = rnd(pid, 'brix', 9.5, 17.5, 1)
        results.append(['Sólidos solúveis', 'Refratometria', f'{num(brix, 1)} °Brix', '-', 'Informativo']); params.append('brix')
    meta[pid] = {'n': number, 'date': date.isoformat(), 'params': params}

    doc = SimpleDocTemplate(str(out_dir / f'{pid}.pdf'), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                            title=f'Boletim de análise {number} - {pt}', author='AgroLab Centro (fictício)', subject='Documento de exemplo - dados fictícios')
    head = Table([[Paragraph('<b>AgroLab Centro</b><br/><font size=8.5>Laboratório de ensaios agroalimentares (fictício)<br/>Zona Industrial, Aveiro</font>', st(13, color=colors.white, lead=15)),
                   Paragraph(f'<b>Boletim de análise</b><br/>n.º {number}<br/><font size=8.5>Emitido a {(date + dt.timedelta(days=2)).strftime("%d/%m/%Y")}</font>', st(11, color=colors.white, lead=14))]],
                 colWidths=[105 * mm, 69 * mm])
    head.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), GREEN), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10)]))
    warn = Table([[Paragraph('<b>DOCUMENTO DE EXEMPLO, COM DADOS FICTÍCIOS.</b> Criado para o projeto académico Daqui (IPA, Universidade de Aveiro). Não corresponde a uma análise real.', st(8.8))]], colWidths=[174 * mm])
    warn.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), GOLD), ('LEFTPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
    ident = [['Produto', f'{pt} ({en})'], ['Produtor', f'{fname}, {farm}, {place}'], ['Cliente', 'Daqui (empresa fictícia)'],
             ['Lote', f'DQ-{pid[:6].upper()}-{date.strftime("%y%m%d")}'], ['Data de receção da amostra', (date - dt.timedelta(days=1)).strftime('%d/%m/%Y')], ['Data do ensaio', date.strftime('%d/%m/%Y')]]
    it = Table([[Paragraph(k, st(9, True)), Paragraph(v, st(9))] for k, v in ident], colWidths=[52 * mm, 122 * mm])
    it.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor('#DCE3C4')), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    th = [Paragraph(h, st(8.8, True, colors.white)) for h in ['Parâmetro', 'Método', 'Resultado', 'Valor de referência', 'Avaliação']]
    rt = Table([th] + [[Paragraph(c.replace('\n', '<br/>'), st(8.8, j == 4)) for j, c in enumerate(r)] for r in results], colWidths=[48 * mm, 34 * mm, 36 * mm, 32 * mm, 24 * mm], repeatRows=1)
    rt.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), GREEN), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, SAGE]), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                            ('LINEBELOW', (0, 0), (-1, -1), 0.4, colors.HexColor('#DCE3C4')), ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    story = [head, Spacer(1, 6), warn, Spacer(1, 12), Paragraph('Identificação da amostra', st(12, True)), Spacer(1, 4), it, Spacer(1, 14),
             Paragraph('Resultados', st(12, True)), Spacer(1, 4), rt, Spacer(1, 12),
             Paragraph('<b>Conclusão:</b> a amostra cumpre os valores de referência aplicáveis aos parâmetros analisados.', st(9.5)), Spacer(1, 8),
             Paragraph('Referências: Regulamento (UE) 2023/915 (contaminantes em géneros alimentícios) e Regulamento (CE) n.º 396/2005 (limites máximos de resíduos de pesticidas). '
                       'Os valores de referência apresentados servem apenas de exemplo. LMR: limite máximo de resíduos. ufc: unidades formadoras de colónias.', st(8, color=colors.HexColor('#5A6B3F'))),
             Spacer(1, 18), Paragraph('Responsável técnico: Eng.ª M. Exemplo (fictícia)', st(9)),
             Paragraph('Os resultados referem-se apenas à amostra ensaiada.', st(8, color=colors.HexColor('#5A6B3F')))]
    doc.build(story)

(SITE / 'js' / 'analises.js').write_text('/* Gerado por ferramentas/gerar-analises.py: número e data do boletim de análise (PDF em docs/analises/) de cada produto. */\n'
                                         'const ANALYSES = ' + json.dumps(meta, ensure_ascii=False, indent=0).replace('\n', '') + ';\n', encoding='utf-8')
print(f'{len(meta)} boletins gerados em docs/analises/ e js/analises.js atualizado.')
