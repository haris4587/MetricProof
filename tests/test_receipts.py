import copy
import importlib.util
import json
from pathlib import Path
import pytest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('verifier',ROOT/'scripts/verify_receipt.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
FILES=list((ROOT/'docs/evidence').glob('receipt-*.json'))
@pytest.mark.parametrize('path',FILES)
def test_live_receipt_integrity(path):
    assert m.verify(json.loads(path.read_text()))
@pytest.mark.parametrize('field',['raw','claim','result','chain'])
def test_tampered_receipt_rejected(field):
    if not FILES:pytest.skip('No captured live evidence yet')
    b=copy.deepcopy(json.loads(FILES[0].read_text()))
    if field=='raw':b['dataset']['raw']+=' '
    if field=='claim':b['claim']['spec']['reported_milli']+=1
    if field=='result':b['history'][0]['receipt']['result']['verdict']='TAMPERED'
    if field=='chain':b['network']['chainId']=1
    with pytest.raises(AssertionError):m.verify(b)
