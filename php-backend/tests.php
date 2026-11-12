<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/core.php';
function check(bool $value,string $name):void {if(!$value){fwrite(STDERR,"FAIL: $name\n");exit(1);}echo "PASS: $name\n";}
$pass='A private test passphrase';$phpHash=password_hash($pass,PASSWORD_BCRYPT);$nodeHash=str_replace('$2y$','$2b$',$phpHash);
check(password_match($pass,$phpHash),'PHP bcrypt verification');
check(password_match($pass,$nodeHash),'Node bcrypt compatibility');
check(!password_match($phpHash,$phpHash)&&!password_match($nodeHash,$nodeHash),'hash-as-password rejection');
check(!password_match('wrong',$phpHash),'incorrect password rejection');
check(password_match('legacy','legacy')&&!password_match('LEGACY','legacy'),'case-sensitive legacy compatibility');
try{password('short');check(false,'short password rejection');}catch(ApiFailure $e){check($e->status===400,'short password rejection');}
try{role('owner');check(false,'unknown role rejection');}catch(ApiFailure $e){check($e->status===400,'unknown role rejection');}
