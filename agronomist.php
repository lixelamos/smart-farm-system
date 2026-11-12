<?php
	session_start();
	if (ob_get_level() > 0) { ob_clean(); }
	include "dbcon.php";
require_once __DIR__."/includes/ui.php";

	if(isset($_SESSION['agron'])){
		$sid=$_SESSION['agron'];
		$sql=mysqli_query($con,"SELECT *FROM `agronomists` WHERE `id`='$sid'");
		$row=mysqli_fetch_assoc($sql); $img=$row['photo'];
		$usern=strip_tags(html_entity_decode(stripslashes($row['name'])));
		$pic=($img=="none") ? "images/user.svg":"photos/$img";

	?>
	<!doctype html><html lang="en"><head>
	<title>Agronomist workspace · Smart Farm</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">

		<link rel="shortcut icon"href="images/favi.png">
		<link rel="stylesheet" href="css/font-awesome/css/font-awesome.min.css">
		<script src="js/jquery.js"></script>


	<link rel="stylesheet" href="<?= sf_asset("css/design.css", "") ?>"><link rel="stylesheet" href="<?= sf_asset("css/workspace.css", "") ?>"><script src="<?= sf_asset("js/design.js", "") ?>" defer></script><script src="<?= sf_asset("js/workspace.js", "") ?>" defer></script>
</head>
	<body class="app-page role-agronomist"><a class="skip-link" href="#workspace-content">Skip to workspace</a>

	<div id="progdv">Loading...</div>
	<div id="toast"><div id="notif"></div></div>
	<div id="progr"><div id="progt"></div></div>

	<?php sf_sidebar("agronomist", $usern); ?><section class="app-content" id="workspace-content"><?php sf_app_header("agronomist"); ?><div class="workspace-body"><div><div class="mainactivity"><?php sf_overview($con, "agronomist", $usern); ?>
			<?php
				$data="";
				$flow="a-$sid";
				$sql=mysqli_query($con,"SELECT DISTINCT `sender`, `time` FROM `chats` WHERE NOT `sender`='$flow' AND `receiver`='$flow' ORDER BY `time` DESC");
				while($row=mysqli_fetch_assoc($sql)){
					$sen=trim($row['sender']);
					$senda=explode("-",$sen)[1];
					$sq=mysqli_query($con,"SELECT *FROM `chats` WHERE `sender`='$sen' AND `receiver`='$flow' AND `status`='0'");
					$no=mysqli_num_rows($sq);
					$sqt=mysqli_query($con,"SELECT *FROM `chats` WHERE (`sender`='$sen' AND `receiver`='$flow') OR (`sender`='$flow' AND `receiver`='$sen')");
					$nu=mysqli_num_rows($sqt);
					$cond=($nu==1) ? "1 Message":"$nu Messages";
					if($no>0){$cnd="<button class='notbtn'style='background:green' >$no</button>";}else{$cnd="";}
					$sqr=mysqli_query($con,"SELECT *FROM `farmers` WHERE `id`='$senda'");
					while($rw=mysqli_fetch_assoc($sqr)){
						$name=prepare(ucwords($rw['name']));
						$data.="<div class='udiv'onclick=\"gotochat('$sen','$flow')\">
						<img src='images/user.svg'style='height:100%;float:left;margin-right:20px;border-radius:50%'><h4>$name $cnd</h4>
						<p style='color:grey;padding:5px 0px'>$cond</p>
						</div><br>";
					}
				}

				echo '<div style="max-width:500px;margin:0 auto">
				<h3 style="padding:10px 0px;color:blue;text-align:center">Farmer Chats </h3><br>
				'.($data !== '' ? $data : '<div class="empty-state"><span aria-hidden="true">↔</span><h4>A conversation starts with a connection.</h4><p>Messages from your farmers will appear here.</p></div>').' </div>';

			?>
			</div>
			</div><br>
		</div>
	</section>

	</body>
	</html>

	<?php
	}
	else{
		header("location:login.php");
	}
	if (ob_get_level() > 0) { ob_end_flush(); }

	?>

	<script>

	function changeprof(){
		var img=_("logo").files[0];
		if(img!=null){
			if(confirm("Replace current Photo with selected one")){
				progressd("Uploading...please wait");
				var data=new FormData(_("ufom"));
				data.append("file",img);
				var x=new XMLHttpRequest();
				x.onreadystatechange=function(){
					if(x.status==200 && x.readyState==4){
						progressd("");
						if(x.responseText.trim()=="success"){
							loadpage("agacc");
						}
						else{
							alert(x.responseText);
						}
					}
				}
				x.open("post","operations.php",true);
				x.send(data);
			}
		}
	}

	function gotochat(sen,u){
		window.open("chat.php?sen="+sen+"&rec="+u+"&tbl=farmers");
	}

	//save news
	function savenews(e){
		e.preventDefault();
		progressd("Posting News...");
		var data=$("#nfom").serialize();
		$.ajax({
			method:"POST",url:"datasaver.php",data:data
		}).done(function(res){
			progressd(""); toast(res);
			if(res.trim()=="success"){loadpage("news");}
		});
	}

	//save user account
	function saveacc(e){
		e.preventDefault();
		progressd("Saving changes...");
		var data=$("#ufom").serialize();
		$.ajax({
			method:"POST",url:"datasaver.php",data:data
		}).done(function(res){
			progressd(""); toast(res);
		});
	}

	setInterval(checkchats,3000);

	function checkchats(){
		$.ajax({
			method:"post",url:"datasaver.php",data:{getcom:"a-<?php echo $sid;?>"}
		}).done(function(res){
			if(res.trim()>0){_("notar").innerHTML='<button class="notbtn">'+res.trim()+'</button>';}
			else{_("notar").innerHTML='';}
		});
	}

	function toast(v){
		rest();
		$("#toast").fadeIn(); _("notif").innerHTML=v;
		tmo=setTimeout(function(){
			$("#toast").fadeOut();
		},5000);
	}

	var tmo;
	function rest(){
		clearTimeout(tmo);
	}

	function progressd(v){
		if(v !=""){
			$("#progr").fadeIn();
			_("progt").innerHTML=v;
		}
		else{
			$("#progr").fadeOut();
			_("progt").innerHTML="";
		}
	}

	function showps() {
		var x = document.getElementById("upass");
		if (x.type === "password") {
			_("sps").style.display="none";_("hdps").style.display="block";
			x.type = "text";
		} else {
			_("sps").style.display="block";_("hdps").style.display="none";
			x.type = "password";
		}
	}

	function loadpage(page){
		$("#progdv").fadeIn();
		if($(".stop").is(":visible")){sidebar("h");}
		$(".mainactivity").load("operations.php?"+page+"&sid=<?php echo $sid;?>",function(response,status,xhr){
			$("#progdv").fadeOut(); if(status=="error"){toast("Failed: Check Internet connection");}
		});
	}

	//validate number input
	function valid(id,v){
		var exp=/^[0-9.]+$/;
		if(! v.match(exp)){
			_(id).value="";
		}
	}

	function _(el){
		return document.getElementById(el);
	}
	</script>
