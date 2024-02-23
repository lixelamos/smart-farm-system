	<?php

	include "dbcon.php";
	
	if(isset($_GET['sen']))
		$data="";
		$ctb=trim($_GET['tbl']); 
		$uid=trim($_GET['sen']); $rid=trim($_GET['rec']); $sid=explode("-",$uid)[1];
		
		mysqli_query($con,"UPDATE `chats` SET `status`='1' WHERE `sender`='$uid' AND `receiver`='$rid' AND `status`='0'");
		$sql=mysqli_query($con,"SELECT *FROM `$ctb` WHERE `id`='$sid'");
		$name=prepare(ucwords(mysqli_fetch_array($sql)['name']));
	
	?>