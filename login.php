	<!DOCTYPE HTML>
	<html>
	<title>Account Login</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no,user-scalable=0">

	<head>
		<link rel="shortcut icon" href="images/favi.icon">
		<link rel="stylesheet" href="css/font-awesome/css/font-awesome.min.css">
		<link rel="stylesheet" href="css/logn.css">
		<script src="js/login.js"></script>

		<style>
			body {
				background: #ffdead;
				background: linear-gradient(to right, #f8f8f8, #f8f0f0, #f0f8f8);
			}

			::placeholder {
				color: #008080;
			}
		</style>

	</head>

	<body>
		<div class="main" style="max-width:380px">
			<center> <img src="images/favi.png" height="100">
				<p style="font-family:helvetica;font-size:16px;color:#191970;padding-top:5px">Agronomist & Farmer Login</p>
			</center><br><br>
			<div class="contents">
				<p style="color:#fff;padding:10px;background:green;margin-bottom:10px;text-align:center;display:none" id="successd"></p>
				<p style="color:#ff4500;font-family:helvetica;background:rgba(255,127,80,0.15);padding:8px;border:1px solid pink;display:none;margin-bottom:10px" id="lgrespo"></p>
				<form method="post" id="logform">
					<p><i class="fa fa-phone" style="font-size:21px;margin-right:5px"></i>
						<input type="number" placeholder="Phone number" name="fon" id="usern" onkeyup="checkkeys(event)" autocomplete="off">
					</p><br><br>
					<p style="padding-top:10px"><i class="fa fa-lock" style="font-size:25px;margin-right:5px"></i>
						<input type="password" placeholder="Password" name="password" id="upass" onkeyup="checkkeys(event)">
					</p><br><br>
				</form>
				<p><button type="submit" id="sbtn" onclick="login()"><i class="fa fa-caret-right"></i> LOGIN</button></p><br>
				<p style="text-align:right"><a href="signup.php">Farmer Signup</a></p>
				<br><br>
			</div>
		</div>
	</body>

	</html>