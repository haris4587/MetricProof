"""Offline receipt integrity verifier. Does not prove network finality or publisher truth."""
import hashlib
import json
import sys

def canonical(v):
    return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=True)

def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()

def verify(bundle):
    d,p,c=bundle['dataset'],bundle['policy'],bundle['claim']
    assert sha(d['raw'])==d['sha256']==c['dataset_id'],'Dataset hash mismatch'
    assert len(d['raw'].encode())==d['bytes'],'Dataset byte count mismatch'
    assert sha(canonical(p))==c['policy_hash'],'Policy hash mismatch'
    keys=['version','dataset_id','spec','submitter','contract','chain_id','policy_hash']
    assert sha(canonical({k:c[k] for k in keys}))==c['id'],'Claim ID mismatch'
    assert c['contract']==bundle['network']['contract'],'Contract binding mismatch'
    assert c['chain_id']==bundle['network']['chainId'],'Chain binding mismatch'
    history=bundle['history']
    assert len(history)==c['attempts'],'Incomplete receipt history'
    previous=''
    for n,item in enumerate(history,1):
        r=item['receipt']
        assert sha(canonical(r))==item['sha256'],'Receipt hash mismatch'
        assert r['case_id']==r['package_hash']==c['id'],'Claim binding mismatch'
        assert r['dataset_sha256']==d['sha256'],'Source binding mismatch'
        assert r['attempt']==n and r['previous']==previous,'Broken receipt history'
        previous=item['sha256']
    assert history and history[-1]==bundle['verification'],'Latest receipt mismatch'
    assert previous==c['receipt_hash'],'Latest hash mismatch'
    assert history[-1]['receipt']['result']['verdict']==c['status'],'Verdict mismatch'
    return True

if __name__=='__main__':
    try:
        verify(json.load(open(sys.argv[1],encoding='utf8')))
        print('PASS: dataset, policy, claim, chain binding and full receipt hash chain match. Verify transaction finality independently.')
    except Exception as e:
        print('FAIL:',e);sys.exit(1)
