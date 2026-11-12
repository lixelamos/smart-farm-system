<?php
	session_start();
	if (ob_get_level() > 0) { ob_clean(); }
	include "dbcon.php";
require_once __DIR__."/../includes/ui.php";

	if(isset($_SESSION['admin'])){
		$sid=$_SESSION['admin'];
		$sql=mysqli_query($con,"SELECT *FROM `admin` WHERE `id`='$sid'");
		$usern=prepare(ucwords(mysqli_fetch_array($sql)['username']));

	?>
	<!doctype html><html lang="en"><head>
	<title>Admin workspace · Smart Farm</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">

		<link rel="shortcut icon"href="../images/favi.png">
		<link rel="stylesheet" href="css/font-awesome/css/font-awesome.min.css">
		<script src="../js/jquery.js"></script>



	<link rel="stylesheet" href="<?= sf_asset("css/design.css", "../") ?>"><link rel="stylesheet" href="<?= sf_asset("css/workspace.css", "../") ?>"><script src="<?= sf_asset("js/design.js", "../") ?>" defer></script><script src="<?= sf_asset("js/workspace.js", "../") ?>" defer></script>
</head>

	<body class="app-page role-admin"><a class="skip-link" href="#workspace-content">Skip to workspace</a>

	<div id="progdv">Loading...</div>
	<div id="toast"><div id="notif"></div></div>
	<div id="progr"><div id="progt"></div></div>

		<?php sf_sidebar("admin", $usern, "../"); ?>

		<section class="app-content" id="workspace-content"><?php sf_app_header("admin"); ?><div class="workspace-body">
				<div class="mainactivity" style="padding:25px;">
				<?php sf_overview($con, "admin", $usern); ?>
					<div style="max-width:650px;margin:0 auto">
					<?php
					$data="";
					$sql=mysqli_query($con,"SELECT *FROM `farmers` WHERE `status`='0' ORDER BY `time` DESC");
					while($row=mysqli_fetch_assoc($sql)){
						$name=ucwords(prepare($row['name'])); $fon=$row['phone']; $idno=$row['idno']; $loc=$row['location']; $st=$row['status'];
						$day=date("d-m-Y, h:i a",$row['time']);
						$cond="<p style='color:grey'><i class='fa fa-clock-o'></i> Unapproved</p>
						<p><span class='lnk'style='color:#ff4500' onclick=\"accstatus('0','$idno')\">Decline</span> &nbsp;
						<span class='lnk' style='color:blue'onclick=\"accstatus('1','$idno')\">Approve</span></p>";

						$data.="<tr valign='top'><td>$name</td><td>0$fon</td><td>$idno</td><td>$loc</td><td>$cond</td><td>$day</td></tr>";
					}
					echo "<br><h4 style='color:blue'>Farmer account requests</h4>";
					echo ($data=="") ? "<p style='color:grey;line-height:50px'>No pending requests. You’re all caught up.</p>":"<table cellpadding='10'style='border:1px solid #ccc;
					border-collapse:collapse;width:100%' border='1'><tr style='font-weight:bold'><td>Name</td><td>Phone</td><td>ID No</td><td>County</td>
					<td>Status</td><td>Registration</td></tr>$data</table><br>";

					$data="";
					$sql=mysqli_query($con,"SELECT *FROM `demand`");
					while($row=mysqli_fetch_assoc($sql)){
						$prod=prepare(ucwords($row['product'])); $ms=$row['measure']; $rate=$row['rate'];
						$mxs=$row['maxsupply']; $st=$row['status']; $id=$row['id'];
						$cond=($st==0) ? "<p>Open<br><span class='lnk' onclick=\"demandopr('1','$id')\">Close</span></p>":
						"<p>Closed<br><span class='lnk' onclick=\"demandopr('0','$id')\">Open</span></p>";
						$data.="<tr><td>$prod</td><td>$ms</td><td>$rate <span class='lnk'onclick=\"changedemand('rate','$id')\">Change</span></td>
						<td>$mxs <span class='lnk' onclick=\"changedemand('maxsupply','$id')\">Change</span></td><td>$cond</td></tr>";
					}

					echo "<br>
					<h4 style='color:blue'>Current produce demand</h4>
					<table cellpadding='3'style='border:1px solid #ccc;float:right;border-collapse:collapse;text-align:center;width:100%'border='1'>
					<caption><button class='btn'style='float:right;padding:4px'onclick=\"loadpage('addproduce')\"><i class='fa fa-plus'></i> Add produce</button></caption>
					<tr style='font-weight:bold'><td>Produce</td><td>Measure</td><td>Price rate</td><td>Quantity demanded</td><td>Status</td></tr>$data</table><br>";
					?>

				</div>
			</div>
		</section>

	</body>
	</html>

	<?php
	}
	else{
		header("location:index.php");
	}
	if (ob_get_level() > 0) { ob_end_flush(); }
?>
	<script>

	//delete station
	function delstation(id){
		if(confirm("Remove Station from the system?")){
			progressd("Deleting...please wait");
			$.ajax({
				method:"post",url:"operations.php",data:{dstn:id}
			}).done(function(res){
				progressd("");
				if(res.trim()=="Deleted"){loadpage("pickups");}
				else{toast(res);}
			});
		}
	}

	//save station
	function savestation(e){
		e.preventDefault();
		progressd("Adding please wait...");
		var data=$("#pfom").serialize();
		$.ajax({
			method:"POST",url:"datasaver.php",data:data
		}).done(function(res){
			progressd(""); toast(res);
			if(res.trim()=="success"){loadpage("pickups");}
		});
	}

	function demandopr(val,id){
		progressd("Processing please wait...");
		$.ajax({
			method:"POST",url:"datasaver.php",data:{dopt:val,did:id}
		}).done(function(res){
			progressd(""); toast(res);
			if(res.trim()=="success"){loadpage("demand");}
		});
	}

	function changedemand(tp,id){
		var cond=(tp=="rate") ? "New price rate":"Maximum demand quantity";
		var nw=prompt("Enter "+cond).trim();
		if(nw!=""){
			progressd("Processing please wait...");
			$.ajax({
				method:"POST",url:"datasaver.php",data:{dtp:tp,did:id,dval:nw}
			}).done(function(res){
				progressd(""); toast(res);
				if(res.trim()=="success"){loadpage("demand");}
			});
		}
	}

	//verify supply
	function verifysup(id){
		if(confirm("Sure to verify the supply from farmer?")){
			$.ajax({
				method:"post",url:"datasaver.php",data:{vrid:id}
			}).done(function(res){
				progressd(""); toast(res);
				if(res.trim()=="success"){loadpage("produce");}
			});
		}
	}

	//approve/dissaprove account
	function accstatus(st,id){
		var cond=(st==0) ? "Sure to Decline account creation? This farmer will be removed from system.":"Activate farmer account? Wont be reversed.";
		if(confirm(cond+" Continue?")){
			$.ajax({
				method:"post",url:"datasaver.php",data:{acst:st,fid:id}
			}).done(function(res){
				progressd(""); toast(res);
				if(res.trim()=="success"){loadpage("farmers");}
			});
		}
	}

	//save demand
	function savedemand(e){
		e.preventDefault();
		progressd("Adding please wait...");
		var data=$("#pfom").serialize();
		$.ajax({
			method:"POST",url:"datasaver.php",data:data
		}).done(function(res){
			progressd(""); toast(res);
			if(res.trim()=="success"){loadpage("demand");}
		});
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

	//save payment
	function savepay(e,amnt,tp){
		e.preventDefault();
		var data=$("#payfom").serialize(); var mode=_("pay").value; var len=tp.split(",").length;

		if(tp=="all"){
			if(mode=="MPESA"){
				toast("MPESA Payment API does not support paying multiple Farmers at the moment,simulate Cash Instead");
			}
			else{
				progressd("Saving payment...");
				$.ajax({
					method:"POST",url:"datasaver.php",data:data
				}).done(function(res){
					progressd(""); toast(res); loadpage("payments");
				});
			}
		}
		else{
			if(mode=="MPESA"){
				if(len>1){
					toast("MPESA Payment API does not support paying multiple Farmers at the moment,simulate Cash Instead");
				}
				else{
					if(confirm("Request MPESA payment of KES "+amnt)){
						progressd("Sending STK Push...");
						$.ajax({
							method:"POST",url:"../payment.php",data:{pay:amnt,uid:tp}
						}).done(function(res){
							progressd("");
							if(res.trim()=="success"){
								setTimeout(function(){
									var code=prompt("Request sent. Enter the MPESA Payment Code.","NK76G45W");
									if(code){
										progressd("Validating payment...");
										$.ajax({
											method:"POST",url:"datasaver.php?pcode="+code,data:data
										}).done(function(res){
											progressd("");
											if(res.trim()!="success"){
												setTimeout(function(){
													alert(res);
												},400);
											}
											else{toast(res); loadpage("payments");}
										});
									}
								},400);
							}
							else{alert(res);}
						});
					}
				}
			}
			else{
				progressd("Saving payment...");
				$.ajax({
					method:"POST",url:"datasaver.php",data:data
				}).done(function(res){
					progressd(""); toast(res); loadpage("payments");
				});
			}
		}
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

	//delete input
	function delprod(id){
		if(confirm("Delete product?")){
			progressd("Removing...please wait");
			$.ajax({
				method:"post",url:"operations.php",data:{dprod:id}
			}).done(function(res){
				progressd("");
				if(res.trim()=="Deleted"){loadpage("addprod");}
				else{toast(res);}
			});
		}
	}

	//delete input
	function delinput(id){
		if(confirm("Delete farm Input?")){
			progressd("Removing...please wait");
			$.ajax({
				method:"post",url:"operations.php",data:{dinput:id}
			}).done(function(res){
				progressd("");
				if(res.trim()=="Deleted"){loadpage("inputs");}
				else{toast(res);}
			});
		}
	}

	//save product
	function saveprod(e){
		e.preventDefault();
		var img=_("foto").files[0];
		progressd("Uploading...please wait");
		var data=new FormData(_("pfom"));
		data.append("file",img);
		var x=new XMLHttpRequest();
		x.onreadystatechange=function(){
			if(x.status==200 && x.readyState==4){
				progressd("");
				if(x.responseText.trim()=="success"){
					loadpage("addprod");
				}
				else{
					alert(x.responseText);
				}
			}
		}
		x.open("post","datasaver.php",true);
		x.send(data);
	}

	//save inputs
	function saveinput(e){
		e.preventDefault();
		var img=_("pic").files[0];
		progressd("Uploading...please wait");
		var data=new FormData(_("upfom"));
		data.append("file",img);
		var x=new XMLHttpRequest();
		x.onreadystatechange=function(){
			if(x.status==200 && x.readyState==4){
				progressd("");
				if(x.responseText.trim()=="success"){
					loadpage("inputs");
				}
				else{
					alert(x.responseText);
				}
			}
		}
		x.open("post","datasaver.php",true);
		x.send(data);
	}

	//delete news
	function delnews(t){
		if(confirm("Remove County News?")){
			progressd("Removing...please wait");
			$.ajax({
				method:"post",url:"operations.php",data:{dnews:t}
			}).done(function(res){
				progressd("");
				if(res.trim()=="Deleted"){loadpage("news");}
				else{toast(res);}
			});
		}
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

	function loadacc(){
		loadpage("tp=myacc&vl=<?php echo $sid; ?>");
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
