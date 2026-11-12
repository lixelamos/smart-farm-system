<?php
session_start();
if (ob_get_level() > 0) { ob_clean(); }
include "dbcon.php";
require_once __DIR__."/../includes/ui.php";

if (isset($_SESSION['manager'])) {
	$sid = $_SESSION['manager'];
	$sql = mysqli_query($con, "SELECT *FROM `manager` WHERE `id`='$sid'");
	$usern = prepare(ucwords(mysqli_fetch_array($sql)['username']));

?>
	<!doctype html><html lang="en"><head>
	<title>Manager workspace · Smart Farm</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">

		<link rel="shortcut icon" href="../images/favi.png">
		<link rel="stylesheet" href="css/font-awesome/css/font-awesome.min.css">
		<script src="../js/jquery.js"></script>



	<link rel="stylesheet" href="<?= sf_asset("css/design.css", "../") ?>"><link rel="stylesheet" href="<?= sf_asset("css/workspace.css", "../") ?>"><script src="<?= sf_asset("js/design.js", "../") ?>" defer></script><script src="<?= sf_asset("js/workspace.js", "../") ?>" defer></script>
</head>

	<body class="app-page role-manager"><a class="skip-link" href="#workspace-content">Skip to workspace</a>

		<div id="progdv">Loading...</div>
		<div id="toast">
			<div id="notif"></div>
		</div>
		<div id="progr">
			<div id="progt"></div>
		</div>

		<?php sf_sidebar("manager", $usern, "../"); ?>

		<section class="app-content" id="workspace-content"><?php sf_app_header("manager"); ?><div class="workspace-body">
				<div class="mainactivity" style="padding:25px;">
					<?php sf_overview($con, "manager", $usern); ?>
					<div style="max-width:650px;margin:0 auto"><br>
						<?php
						$data = "";
						$sql = mysqli_query($con, "SELECT *FROM `inputs` ORDER BY `time` DESC");
						while ($row = mysqli_fetch_assoc($sql)) {
							$name = prepare($row['name']);
							$det = nl2br(prepare($row['details']));
							$pic = $row['photo'];
							$id = $row['id'];
							$cost = fnum($row['cost']);
							$loc = prepare($row['county']);
							$post = date("M d, h:i a", $row['time']);
							$data .= "<tr valign='top'><td><img src='../photos/$pic' style='max-width:100%;max-height:120px'></td><td><h4 style='color:#008080'>$name @Ksh $cost</h4>
						<p style='padding:6px 0px'>$det</p><p style='color:#008fff;font-size:14px'>For $loc county</p>
						<p style='padding:10px 0px;text-align:right;color:grey;'><i>$post</i></p></td></tr>";
						}

						$tr = "";
						$tot = 0;
						$qry = mysqli_query($con, "SELECT `product`,`photo`,`cost`,`farmer` FROM `sales` ORDER BY `time` DESC");
						while ($row = mysqli_fetch_assoc($qry)) {
							$name = prepare($row['product']);
							$pic = $row['photo'];
							$cost = fnum($row['cost']);
							$fid = $row['farmer'];
							$sq = mysqli_query($con, "SELECT *FROM `sales` WHERE `product`='" . $row['product'] . "' AND `photo`='" . $row['photo'] . "' AND `farmer`='$fid'");
							$no = mysqli_num_rows($sq);
							$qri = mysqli_query($con, "SELECT *FROM `farmers` WHERE `id`='$fid'");
							$fname = prepare(ucwords(mysqli_fetch_array($qri)['name']));
							while ($rw = mysqli_fetch_assoc($sq)) {
								$paid = $rw['paid'];
								$dy = date("M d, H:i", $rw['time']);
								if ($paid == 0) {
									$tot += $rw['cost'];
								}
								$pd = ($paid == 0) ? "Unpaid" : "Paid on " . date("d-m-Y, h:i a", $paid);
							}
							$tr .= "<tr valign='top'><td><img src='../photos/$pic'height='100px'></td><td><h4>$fname</h4><p>$name</p><p style='padding:6px 0px'>($no) Ksh $cost</p>
						<p style='font-size:14px;color:#2f4f4f'>$pd</p><p style='color:blue;text-align:right'><i>$dy</i></p></td></tr>";
						}

						echo "<div style='max-width:600px;margin:0 auto'><h4 style='color:blue'>Farm Inputs
					<button class='btn'style='float:right;background:#F08080;padding:5px'onclick=\"genpdf('inputs')\"><i class='fa fa-file-pdf-o'></i> PDF</button></h4><br>";
						echo ($data == "") ? "<p style='background:#f0f0f0;border:1px solid #ccc;padding:10px'>No Farm Inputs found for farmers</p>" :
							"<table cellpadding='10'>$data</table>";
						echo "<br><br><h4 style='color:blue'>Purchased Inputs</h4><br><table cellpadding='10'>$tr</table><br></div>";
						?>

					</div>
				</div>
		</section>

	</body>

	</html>

<?php
} else {
	header("location:index.php");
}
if (ob_get_level() > 0) { ob_end_flush(); }
?>
<script>
	//save agronomist
	function saveagron(e) {
		e.preventDefault();
		progressd("Adding please wait...");
		var data = $("#afom").serialize();
		$.ajax({
			method: "POST",
			url: "operations.php",
			data: data
		}).done(function(res) {
			progressd("");
			toast(res);
			if (res.trim() == "success") {
				loadpage("agronomist");
			}
		});
	}

	//save news
	function savenews(e) {
		e.preventDefault();
		progressd("Posting News...");
		var data = $("#nfom").serialize();
		$.ajax({
			method: "POST",
			url: "operations.php",
			data: data
		}).done(function(res) {
			progressd("");
			toast(res);
			if (res.trim() == "success") {
				loadpage("news");
			}
		});
	}

	//save user account
	function saveacc(e) {
		e.preventDefault();
		progressd("Saving changes...");
		var data = $("#ufom").serialize();
		$.ajax({
			method: "POST",
			url: "operations.php",
			data: data
		}).done(function(res) {
			progressd("");
			toast(res);
		});
	}


	function genpdf(rec) {
		window.open("pdf/files/printout.php?tp=" + rec);
	}

	//delete agronomist
	function delagron(id) {
		if (confirm("Remove Agronomist from the system?")) {
			progressd("Deleting...please wait");
			$.ajax({
				method: "post",
				url: "operations.php",
				data: {
					dagron: id
				}
			}).done(function(res) {
				progressd("");
				if (res.trim() == "Deleted") {
					loadpage("agronomist");
				} else {
					toast(res);
				}
			});
		}
	}

	//delete news
	function delnews(t) {
		if (confirm("Remove County News?")) {
			progressd("Removing...please wait");
			$.ajax({
				method: "post",
				url: "operations.php",
				data: {
					dnews: t
				}
			}).done(function(res) {
				progressd("");
				if (res.trim() == "Deleted") {
					loadpage("news");
				} else {
					toast(res);
				}
			});
		}
	}

	function toast(v) {
		rest();
		$("#toast").fadeIn();
		_("notif").innerHTML = v;
		tmo = setTimeout(function() {
			$("#toast").fadeOut();
		}, 5000);
	}

	var tmo;

	function rest() {
		clearTimeout(tmo);
	}

	function progressd(v) {
		if (v != "") {
			$("#progr").fadeIn();
			_("progt").innerHTML = v;
		} else {
			$("#progr").fadeOut();
			_("progt").innerHTML = "";
		}
	}

	function showps() {
		var x = document.getElementById("upass");
		if (x.type === "password") {
			_("sps").style.display = "none";
			_("hdps").style.display = "block";
			x.type = "text";
		} else {
			_("sps").style.display = "block";
			_("hdps").style.display = "none";
			x.type = "password";
		}
	}

	function loadpage(page) {
		$("#progdv").fadeIn();
		if ($(".stop").is(":visible")) {
			sidebar("h");
		}
		$(".mainactivity").load("operations.php?" + page + "&sid=<?php echo $sid; ?>", function(response, status, xhr) {
			$("#progdv").fadeOut();
			if (status == "error") {
				toast("Failed: Check Internet connection");
			}
		});
	}

	function loadacc() {
		loadpage("tp=myacc&vl=<?php echo $sid; ?>");
	}

	//validate number input
	function valid(id, v) {
		var exp = /^[0-9.]+$/;
		if (!v.match(exp)) {
			_(id).value = "";
		}
	}

	function _(el) {
		return document.getElementById(el);
	}
</script>
