<?php
session_start();
if (ob_get_level() > 0) { ob_clean(); }
include "dbcon.php";
require_once __DIR__."/includes/ui.php";

if (isset($_SESSION['farmer'])) {
	$sid = $_SESSION['farmer'];
	$sql = mysqli_query($con, "SELECT *FROM `farmers` WHERE `id`='$sid'");
	$row = mysqli_fetch_assoc($sql);
	$usern = strip_tags(html_entity_decode(stripslashes(ucwords($row['name']))));
	$fon = $row['phone'];

?>
	<!doctype html><html lang="en"><head>
	<title>Farmer workspace · Smart Farm</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">

		<link rel="shortcut icon" href="images/favi.png">
		<link rel="stylesheet" href="css/font-awesome/css/font-awesome.min.css">
		<script src="js/jquery.js"></script>


	<link rel="stylesheet" href="<?= sf_asset("css/design.css", "") ?>"><link rel="stylesheet" href="<?= sf_asset("css/workspace.css", "") ?>"><script src="<?= sf_asset("js/design.js", "") ?>" defer></script><script src="<?= sf_asset("js/workspace.js", "") ?>" defer></script>
</head>

	<body class="app-page role-farmer"><a class="skip-link" href="#workspace-content">Skip to workspace</a>

		<div id="progdv">Loading...</div>
		<div id="toast">
			<div id="notif"></div>
		</div>
		<div id="progr">
			<div id="progt"></div>
		</div>

		<div class="main">
			<?php sf_sidebar("farmer", $usern); ?>
			<section class="app-content" id="workspace-content"><?php sf_app_header("farmer"); ?>

				<div class="mainactivity" style="padding:20px">
					<div class="overview-data">
						<br>
						<?php sf_overview($con, "farmer", $usern); ?>
						<h4 style='color:blue'>Current produce demand</h4>
						<?php
						$data = "";
						$sql = mysqli_query($con, "SELECT *FROM `demand`");
						while ($row = mysqli_fetch_assoc($sql)) {
							$prod = prepare(ucwords($row['product']));
							$ms = prepare($row['measure']);
							$rate = fnum($row['rate']);
							$mxs = $row['maxsupply'];
							$st = $row['status'];
							$cond = ($st == 0) ? "Open" : "Closed";
							$data .= "<tr valign='top'><td><p>$prod</p><p style='color:#008080'>$ms @Ksh $rate</p></td><td>$mxs</td><td>$cond</td></tr>";
						}
						echo "<table cellpadding='10' style='width:100%;border:1px solid #ccc;border-collapse:collapse' border='1'>
				<tr style='font-weight:bold'><td>Product</td><td>Demand</td><td>Status</td></tr>$data</table>";
						echo "<br><h4 style='color:blue'>County updates</h4><br>";
						$res = "";
						$sql = mysqli_query($con, "SELECT *FROM `news` ORDER BY `time` DESC");
						while ($row = mysqli_fetch_assoc($sql)) {
							$mssg = nl2br(prepare($row['message']));
							$loc = ucfirst($row['county']);
							$day = date("M d, h:i a", $row['time']);
							$sen = ucfirst(prepare($row['source']));
							$res .= "<tr valign='top'><td><div style='width:50px;height:50px;border-radius:50%;background:#2E8B57;text-align:center'>
					<i class='fa fa-user'style='font-size:25px;color:#fff;margin-top:10px'></i></div></td>
					<td><h4>$loc</h4><p style='padding:5px 0px'>$mssg</p><p style='color:grey'><i><span style='color:#008fff'>$sen,</span> $day</i></p>
					</td></tr>";
						}

						echo ($res == "") ? "<p style='color:grey;line-height:80px'>No News</p>" : "<table cellpadding='10'>$res</table>";
						?>
					</div>
				</div>
			</section>
		</div>
	</body>

	</html>

<?php
} else {
	header("location:login.php");
}
if (ob_get_level() > 0) { ob_end_flush(); }

?>

<script>
	function addcart(id, tp) {
		var tm = _("temps").value.trim();
		var nw = (tm != "") ? tm + "," + id : id;
		_("temps").value = nw;
		var no = nw.split(",").length;
		toast("Item added to Cart");
		var tot = (no == 1) ? "1 Item" : no + " Items";
		if (tp == "inputs") {
			_("cbtn").innerHTML = "<p><button class='btn'style='float:right' onclick='buyinputs()'>Buy " + tot + "</button></p><br>";
		} else {
			_("cbtn").innerHTML = "<p><button class='btn'style='float:right' onclick='buyprods()'>Buy " + tot + "</button></p><br>";
		}
	}

	function buyprods() {
		var tm = _("temps").value.trim();
		loadpage("buyprods=" + tm);
	}

	function buyinputs() {
		var tm = _("temps").value.trim();
		loadpage("buyinputs=" + tm);
	}

	function showprod(id) {
		loadpage("produce=" + id);
	}

	function gotochat(sen, u) {
		window.open("chat.php?sen=" + sen + "&rec=" + u + "&tbl=agronomists");
	}

	function cancelsup(tm, p) {
		if (confirm("Sure to Cancel the supplied Produce?")) {
			progressd("Canceling...please wait");
			$.ajax({
				method: "post",
				url: "operations.php",
				data: {
					delsup: tm,
					pid: p
				}
			}).done(function(res) {
				progressd("");
				if (res.trim() == "Deleted") {
					loadpage('produce');
				} else {
					toast(res);
				}
			});
		}
	}

	function sidebar(t) {
		if (t == "show") {
			$("aside").show();
			$("aside").animate({
				width: "100%"
			}, 600);
		} else {
			$("aside").animate({
				width: "0px"
			});
			setTimeout(function() {
				$("aside").hide();
			}, 300);
		}
	}

	function payitems(ids, a, u, f) {
		if (confirm("Request MPESA payment of KES " + a)) {
			progressd("Sending STK Push...");
			$.ajax({
				method: "POST",
				url: "payment.php",
				data: {
					mpay: a,
					phone: "<?php echo $fon; ?>"
				}
			}).done(function(res) {
				progressd("");
				if (res.trim() == "success") {
					setTimeout(function() {
						var code = prompt("Request sent to 0<?php echo $fon; ?>. Enter the MPESA Payment Code.", "NK76G45W");
						if (code) {
							if (f == "saveitems") {
								saveitems(ids, u, code);
							} else {
								saveprods(ids, u, code);
							}
						}
					}, 400);
				} else {
					alert(res);
				}
			});
		}
	}

	//save purchased products
	function saveprods(ids, u, code) {
		progressd("Validating...please Wait");
		$.ajax({
			method: "POST",
			url: "datasaver.php",
			data: {
				prids: ids,
				pfid: u,
				pcode: code
			}
		}).done(function(res) {
			progressd("");
			if (res.trim() == "success") {
				loadpage("products");
			} else {
				setTimeout(function() {
					var cod = prompt(res + ". Re-Enter the Code", "NK76G45W");
					if (cod) {
						saveprods(ids, u, cod);
					}
				}, 400);
			}
		});
	}

	//save items
	function saveitems(ids, u, code) {
		progressd("Validating...please wait");
		$.ajax({
			method: "POST",
			url: "datasaver.php",
			data: {
				pids: ids,
				fid: u,
				pcode: code
			}
		}).done(function(res) {
			progressd("");
			if (res.trim() == "success") {
				loadpage("inputs");
			} else {
				setTimeout(function() {
					var cod = prompt(res + ". Re-Enter the Code", "NK76G45W");
					if (cod) {
						saveitems(ids, u, cod);
					}
				}, 400);
			}
		});
	}

	//save produce
	function saveproduce(e) {
		e.preventDefault();
		progressd("Saving changes...");
		var data = $("#pfom").serialize();
		$.ajax({
			method: "POST",
			url: "datasaver.php",
			data: data
		}).done(function(res) {
			progressd("");
			toast(res);
			if (res.trim() == "success") {
				loadpage("produce");
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
			url: "datasaver.php",
			data: data
		}).done(function(res) {
			progressd("");
			toast(res);
		});
	}

	setInterval(checkchats, 3000);

	function checkchats() {
		$.ajax({
			method: "post",
			url: "datasaver.php",
			data: {
				getcom: "f-<?php echo $sid; ?>"
			}
		}).done(function(res) {
			if (res.trim() > 0) {
				_("notar").innerHTML = '<button class="notbtn">' + res.trim() + '</button>';
			} else {
				_("notar").innerHTML = '';
			}
		});
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
