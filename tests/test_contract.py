import copy
import hashlib
import json
from pathlib import Path
import pytest
from gltest.direct import VMContext, deploy_contract, create_address

ROOT = Path(__file__).resolve().parents[1]
RAW = (ROOT / 'fixtures/revenue.json').read_text()
URL = 'https://raw.githubusercontent.com/haris4587/MetricProof/' + 'a'*40 + '/fixtures/revenue.json'

def spec(value=18000):
    return {'claim':'Revenue across all North and South divisions grew by 18% from calendar year 2024 to 2025.', 'operation':'GROWTH', 'period':'2025', 'baseline':'2024', 'category':'', 'reported_milli':value, 'chart':{'kind':'none','axis_min':0,'axis_max':0,'unit':'USD','caption':''}}

@pytest.fixture
def ctx():
    vm = VMContext()
    with vm.activate():
        vm.sender = create_address('alice')
        c = deploy_contract(ROOT / 'contracts/metric_proof.py', vm)
        yield vm, c

def register(c, s=None, url=''):
    did = c.register_dataset(RAW, url)
    return did, c.submit_claim(did, json.dumps(s or spec()))

def mock(vm, meaning='MATCH', framing='FAIR'):
    vm.mock_llm('.*', json.dumps({'meaning':meaning,'framing':framing,'quote':'Revenue'}))

@pytest.mark.parametrize('value,expected', [(18000,'ACCURATE'),(45000,'INCORRECT'),(18001,'INCORRECT'),(17999,'INCORRECT')])
def test_numbers_and_receipt(ctx,value,expected):
    vm,c=ctx; mock(vm)
    did,cid=register(c,spec(value)); rh=c.verify(cid)
    case=json.loads(c.get_case(cid)); receipt=json.loads(c.get_receipt(cid,1))
    assert case['status']==expected
    assert case['receipt_hash']==rh==receipt['sha256']
    assert receipt['receipt']['result']['calculation']['numerator']==1800000
    assert receipt['receipt']['result']['calculation']['denominator']==100000
    canonical=json.dumps(receipt['receipt'],sort_keys=True,separators=(',',':'),ensure_ascii=True)
    assert hashlib.sha256(canonical.encode()).hexdigest()==rh
    assert vm.run_validator() is True
    assert json.loads(c.get_dataset(did))['sha256']==hashlib.sha256(RAW.encode()).hexdigest()

@pytest.mark.parametrize('meaning,framing,expected',[('MATCH','MISLEADING','MISLEADING'),('MISMATCH','FAIR','MISLEADING'),('UNKNOWN','FAIR','INCONCLUSIVE'),('MATCH','UNKNOWN','INCONCLUSIVE')])
def test_semantic_precedence(ctx,meaning,framing,expected):
    vm,c=ctx;mock(vm,meaning,framing);_,cid=register(c);c.verify(cid)
    assert json.loads(c.get_case(cid))['status']==expected

def test_unknown_precedes_bad_number(ctx):
    vm,c=ctx;mock(vm,'UNKNOWN');_,cid=register(c,spec(45000));c.verify(cid)
    assert json.loads(c.get_case(cid))['status']=='INCONCLUSIVE'

def test_validator_rejects_changed_number_and_meaning(ctx):
    vm,c=ctx;mock(vm);_,cid=register(c);c.verify(cid)
    r=json.loads(c.get_receipt(cid,1))['receipt']['result']
    bad=copy.deepcopy(r);bad['calculation']['numerator']+=1
    assert vm.run_validator(leader_result=bad) is False
    bad=copy.deepcopy(r);bad['semantic']['meaning']='MISMATCH'
    assert vm.run_validator(leader_result=bad) is False
    bad=copy.deepcopy(r);bad['semantic']['quote']='invented quotation'
    assert vm.run_validator(leader_result=bad) is False

def test_owner_and_finality(ctx):
    vm,c=ctx;mock(vm);_,cid=register(c)
    vm.sender=create_address('bob')
    with pytest.raises(Exception): c.verify(cid)
    vm.sender=create_address('alice');c.verify(cid)
    with pytest.raises(Exception): c.verify(cid)
    with pytest.raises(Exception): c.submit_claim(hashlib.sha256(RAW.encode()).hexdigest(),json.dumps(spec()))

def test_retry_history(ctx):
    vm,c=ctx;mock(vm,'UNKNOWN');_,cid=register(c)
    for n in range(1,4):
        c.verify(cid)
        r=json.loads(c.get_receipt(cid,n))['receipt']
        assert r['attempt']==n
        assert bool(r['previous'])==(n>1)
    with pytest.raises(Exception): c.verify(cid)

def test_web_integrity(ctx):
    vm,c=ctx;mock(vm);vm.mock_web('raw.github',{'status':200,'body':b'tampered'})
    _,cid=register(c,url=URL);c.verify(cid)
    assert json.loads(c.get_case(cid))['status']=='INCONCLUSIVE'
    assert vm.run_validator() is True

def test_web_authenticated(ctx):
    vm,c=ctx;mock(vm);vm.mock_web('raw.github',{'status':200,'body':RAW.encode()})
    _,cid=register(c,url=URL);c.verify(cid)
    assert json.loads(c.get_case(cid))['status']=='ACCURATE'
    assert vm.run_validator() is True

@pytest.mark.parametrize('kind',['float','duplicate','boolean','negative','duplicate_row','extra','empty'])
def test_bad_datasets(ctx,kind):
    _,c=ctx;d=json.loads(RAW)
    if kind=='float': d['rows'][0]['value']=1.5
    if kind=='boolean': d['rows'][0]['value']=True
    if kind=='negative': d['rows'][0]['value']=-1
    if kind=='duplicate_row': d['rows'].append(d['rows'][0])
    if kind=='extra': d['unexpected']=1
    if kind=='empty': d['rows']=[]
    raw=json.dumps(d) if kind!='duplicate' else RAW.replace('"metric":"Revenue"','"metric":"Revenue","metric":"Profit"')
    with pytest.raises(Exception):c.register_dataset(raw,'')

@pytest.mark.parametrize('url',['http://localhost/a','https://raw.githubusercontent.com/x/y/main/a.json','https://raw.githubusercontent.com/x/y/'+'a'*40+'/../x'])
def test_bad_urls(ctx,url):
    with pytest.raises(Exception):ctx[1].register_dataset(RAW,url)

@pytest.mark.parametrize('op,reported,expected_num,expected_den',[('TOTAL',118000000,118000,1),('AVERAGE',59000000,118000,2),('SHARE',59322,7000000,118000)])
def test_operations(ctx,op,reported,expected_num,expected_den):
    vm,c=ctx;mock(vm);s=spec(reported);s.update(operation=op,baseline='',category='North' if op=='SHARE' else '')
    _,cid=register(c,s);c.verify(cid)
    r=json.loads(c.get_receipt(cid,1))['receipt']['result']
    assert r['calculation']['numerator']==expected_num and r['calculation']['denominator']==expected_den
    assert r['verdict']=='ACCURATE'

def test_chart(ctx):
    vm,c=ctx;mock(vm);s=spec();s['chart']={'kind':'bar','axis_min':30000,'axis_max':80000,'unit':'USD','caption':'Revenue by division'}
    _,cid=register(c,s);c.verify(cid)
    assert json.loads(c.get_case(cid))['status']=='MISLEADING'

def test_zero_baseline(ctx):
    vm,c=ctx;mock(vm);d=json.loads(RAW)
    for r in d['rows']:
        if r['period']=='2024':r['value']=0
    did=c.register_dataset(json.dumps(d),'');cid=c.submit_claim(did,json.dumps(spec()));c.verify(cid)
    assert json.loads(c.get_case(cid))['status']=='INCONCLUSIVE'

def test_mismatched_cohort(ctx):
    _,c=ctx;d=json.loads(RAW);d['rows'][0]['category']='Other'
    did=c.register_dataset(json.dumps(d),'')
    with pytest.raises(Exception):c.submit_claim(did,json.dumps(spec()))
