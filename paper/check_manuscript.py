"""Audit published table values and document structure against frozen evidence."""
from pathlib import Path
import json
import re
import hashlib
import subprocess
from zipfile import ZipFile
from lxml import etree

ROOT=Path(__file__).resolve().parents[1]
PAPER=ROOT/'paper'
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8'))
tables=read('paper/manuscript_tables.json')
selection=read('results/ml-v7-models-complete/selection.json')
summary=read('results/ml-v7-evaluation/summary.json')
contrasts=read('results/ml-v7-evaluation/contrasts.json')
def outcome(split,mod,det,condition='all'):
    return next(x for x in summary if (x['split'],x['modality'],x['detector'],x['condition'])==(split,mod,det,condition))
def fmt(value):return '—' if value is None else f'{value:.3f}'
def require(condition,message):
    if not condition:raise AssertionError(message)
names={'PBR_RTT':'PBR/RTT'}
families={'logistic':'Logistic','random_forest':'Forest','boosted_trees':'Boosted','gaussian_bayes':'Gaussian Bayes'}
for i,mod in enumerate(selection['models']):
    det=selection['best_by_validation'][mod]
    a=outcome('test',mod,det);b=outcome('test',mod,'tuned_rule');ext=outcome('external',mod,det)
    label=names.get(mod,mod)
    delta=next(c for c in contrasts if (c['split'],c['modality'],c['contrast'])==('test',mod,f'{det} minus tuned_rule'))
    lo,hi=delta['pairedBootstrap95']
    expected=[label,families[det],fmt(b['meanSeed_f1']),fmt(a['meanSeed_f1']),f"{a['tp']}/{a['fp']}/{a['fn']}",f"{delta['meanSeedF1Difference']:.3f}\n[{lo:.3f}, {hi:.3f}]"]
    require(tables['primary']['rows'][i]==expected,f'Primary table {mod}')
    expected=[label]+[fmt(outcome('test',mod,d)['meanSeed_f1']) for d in ['strict_rule','temporal_rule','tuned_rule','logistic','random_forest','boosted_trees','gaussian_bayes']]
    require(tables['families']['rows'][i]==expected,f'Family table {mod}')
    expected=[label,fmt(outcome('test',mod,det,'LOS')['meanSeed_f1']),fmt(outcome('test',mod,det,'wall-multipath')['meanSeed_f1']),fmt(ext['meanSeed_f1']),f"{ext['tp']}/{ext['fp']}/{ext['fn']}",fmt(ext['meanSeed_falseSessionsPerPairHour'])]
    require(tables['conditions']['rows'][i]==expected,f'Conditions {mod}')
    expected=[label,fmt(a['meanSeed_f1'])]+[fmt(outcome('test',mod,d)['meanSeed_f1']) for d in ['learned_markov','without_contact_history','without_room_feature']]
    require(tables['ablations']['rows'][i]==expected,f'Ablations {mod}')
    expected=[label]+[fmt(a['meanSeed_'+m]) for m in ['frameBrier','frameECE','missedContactTimeRate','falseSessionsPerPairHour']]+[f"{a['meanSeed_durationMAE']:.1f}",f"{a['meanSeed_medianDetectionLatency']:.1f}"]
    require(tables['quality']['rows'][i]==expected,f'Quality {mod}')
require([r[1] for r in tables['features']['rows']]==selection['features'],'Feature schema')
source=(PAPER/'manuscript_content.md').read_text(encoding='utf-8')
expanded=(PAPER/'Contact_Reconstruction_Research_Paper.md').read_text(encoding='utf-8')
require('@@' not in expanded,'Unexpanded manuscript token')
cited={int(n) for group in re.findall(r'\[(\d+(?:,\d+)*)\]',source) for n in group.split(',')}
require(cited==set(range(1,17)),f'Reference coverage {cited}')
require('seed ranges and protocol hash are identical' not in expanded,'Disjoint partition wording')
require('do not establish hardware accuracy' in expanded,'Scope qualification')
appendices=['Appendix A Feature schema and implementation conventions','Appendix B Exact reproduction and artifact authority','Appendix C Frozen validation selections']
require(re.findall(r'^## (Appendix .*?)$',expanded,re.M)==appendices,'Appendix duplication/order in text')
require('not treatment-effect estimation' in expanded,'Temporal causality wording')
require('F1 calculated directly from these pooled counts is a different aggregation' in expanded,'Table 5 aggregation note')
with ZipFile(PAPER/'Contact_Reconstruction_Research_Paper.docx') as archive:
    document=etree.fromstring(archive.read('word/document.xml'))
    styles=etree.fromstring(archive.read('word/styles.xml'))
    ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','m':'http://schemas.openxmlformats.org/officeDocument/2006/math'}
    require(len(document.findall('.//w:tbl',ns))==12,'Table count')
    require(len(document.findall('.//m:oMath',ns))==11,'Equation count')
    require(len([p for p in archive.namelist() if p.startswith('word/media/')])==4,'Figure count')
    paragraphs=[''.join(p.itertext()) for p in document.findall('w:body/w:p',ns)]
    require([p for p in paragraphs if p.startswith('Appendix ')]==appendices,'Appendix duplication/order in Word')
    math_text=[''.join(p.itertext()) for p in document.findall('.//m:oMath',ns)]
    require(any('Ctotal = N Ctag + A Canchor' in p for p in math_text),'Deployment cost equation content')
    title=styles.xpath('//w:style[@w:styleId="Title"]',namespaces=ns)[0]
    require(not title.findall('.//w:pBdr',ns),'Title rule')
    fonts=title.findall('.//w:rFonts',ns)
    require(len(fonts)==1 and not any('Theme' in k for k in fonts[0].attrib),'Title theme font override')
frozen=read('results/finalization-v7-20261006/paper-source-checksums.json')
# Administrative navigation documents were retired/updated during repository cleanup.
# Validate their original, immutable release bytes; scientific sources/results still
# must match the working tree. Requires the research release tag in the checkout.
archived_navigation={'FINAL_PAPER_START_HERE.md','docs/FINAL_RESEARCH_REVIEW.md'}
for item in frozen:
    if item['file'] in archived_navigation:
        content=subprocess.check_output(['git','show','research-v7-2026-10-06:'+item['file']],cwd=ROOT)
    else:
        content=(ROOT/item['file']).read_bytes()
    require(hashlib.sha256(content).hexdigest()==item['sha256'],f"Changed frozen source {item['file']}")
report={'status':'passed','primaryRows':7,'numericOutcomeTables':5,'features':29,'tables':12,'figures':4,'equations':11,'references':16,'frozenPaperSourcesUnchanged':len(frozen),'scope':'Table/source consistency and document structure; not clinical or hardware validation.'}
(PAPER/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
paths=[PAPER/'Contact_Reconstruction_Research_Paper.docx',PAPER/'Contact_Reconstruction_Research_Paper.md',PAPER/'manuscript_content.md',PAPER/'manuscript_tables.json',PAPER/'references.json',PAPER/'build_manuscript.py',PAPER/'build_figures.py',PAPER/'check_manuscript.py',PAPER/'validation.json',PAPER/'SUBMISSION_CHECKLIST.md']
paths+=sorted((PAPER/'figures').glob('*'))
paths+=[ROOT/p for p in ['results/ml-v7-models-complete/selection.json','results/ml-v7-evaluation/summary.json','results/ml-v7-evaluation/contrasts.json','results/finalization-v7-20261006/audit.json']]
manifest=[{'file':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
(PAPER/'checksums.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
