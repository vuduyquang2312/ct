const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const momentTimezone = require('moment-timezone');
const moment = require('moment');
const app = express();
const PORT = 3000;
const { MongoClient } = require('mongodb');
const axios = require('axios');
const uri = 'mongodb://localhost:27017';
const dbName = 'mydb';
const collectionName = 'products';
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const numeral = require('numeral');
const router = express.Router();
//ejs
app.set('view engine', 'ejs');

//kết nối mongo
mongoose.connect('mongodb://localhost:27017/mydb', { useNewUrlParser: true, useUnifiedTopology: true });
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//bảng user
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});

const UserModel = mongoose.model('User', userSchema);

//bảng người dùng
const customerSchema = new mongoose.Schema({
    username: String,
    phone: String,
    address: String

});

const CustomerModel = mongoose.model('Customer', customerSchema);

//bảng sản phẩm
const productSchema = new mongoose.Schema({
    name: String,
    price: String,
    username: String,
    clickCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    totalPrice: Number
});

const Product = mongoose.model('Product', productSchema);

// Định nghĩa Schema cho bảng SanPham
const sanPhamSchema = new mongoose.Schema({
    username: String,
    name: String,
    price: String
});
const SanPham = mongoose.model('SanPham', sanPhamSchema);

//bảng data
const dataSchema = new Schema({
    name: String,
    clickCount: Number,
    username: String,
    totalPrice: String,
    fullName: String,
    phoneNumber: String,
    email: String,
    address: String,
    paymentMethod: String
});

const Data = mongoose.model('Data', dataSchema);

const statisticsSchema = new mongoose.Schema({
    username: String,
    totalFrequency: Number,
    totalMonetary: String,
    latestPurchaseDate: Date,
    latestPurchaseText: String
});

const StatisticsModel = mongoose.model('Statistics', statisticsSchema);

//bảng email
const emailSchema = new mongoose.Schema({
    email: String
});
const EmailModel = mongoose.model('Email', emailSchema);

// Định nghĩa schema cho thông tin đăng nhập
const loginInfoSchema = new Schema({
    username: String,
    ipAddress: String,
    loginTime: String
});

// Tạo model từ schema
const LoginInfoModel = mongoose.model('LoginInfo', loginInfoSchema);

// thêm sản phẩm
app.post('/api/addProduct', async (req, res) => {
    const { username, name, price } = req.body;

    try {
        const newProduct = new Product({
            username,
            name,
            price
        });

        await newProduct.save();

        res.status(200).json({ message: 'Thêm sản phẩm mới thành công' });
    } catch (error) {
        console.error('Lỗi khi thêm sản phẩm:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi thêm sản phẩm' });
    }
});
//gửi post sản phẩm bên máy khách lên server
app.post('/add-to-cart', async (req, res) => {
    const { name, price, username } = req.body;

    try {
        const existingProduct = await Product.findOne({ name, username });

        const currentTime = moment().tz('Asia/Ho_Chi_Minh');

        if (existingProduct) {

            const updatedClickCount = existingProduct.clickCount + 1;
            const priceNumber = parseFloat(existingProduct.price.replace(/[.₫]/g, ''));
            const totalPrice = priceNumber * updatedClickCount;

            await Product.updateOne(
                { name, username },
                { $set: { clickCount: updatedClickCount, createdAt: currentTime, totalPrice: totalPrice } }
            );

            res.json({ message: 'Cập nhật giỏ hàng thành công' });
        } else {

            const product = new Product({
                name,
                price,
                username,
                clickCount: 1,
                createdAt: currentTime,
                totalPrice: parseFloat(price.replace(/[.₫]/g, ''))
            });
            await product.save();
            res.json({ message: 'Thêm vào giỏ hàng thành công' });
        }
    } catch (error) {
        console.error('Error adding product to cart:', error); // Log lỗi
        res.status(500).json({ message: 'Failed to add product to cart' }); // Trả về lỗi
    }
});

//gửi post eamil bên máy khách lên server
app.post('/email', async (req, res) => {
    const { email } = req.body;

    try {

        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Định dạng email không hợp lệ' });
        }

        const existingEmail = await EmailModel.findOne({ email });

        if (existingEmail) {

            return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống. Vui lòng nhập email khác.' });
        }

        const newEmail = new EmailModel({ email });
        await newEmail.save();

        res.status(201).json({ message: 'Đăng ký email thành công' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi' });
    }
});

//định nghĩa đường truyền
app.get('/dangky', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});
app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});
app.get('/shopping', (req, res) => {
    res.sendFile(__dirname + '/shopping.html');
});

//trang sản phẩm
app.get('/products', (req, res) => {
    MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(client => {
            const db = client.db(dbName);
            const collection = db.collection(collectionName);

            collection.find({}).toArray()
                .then(products => {
                    res.json(products);
                })
                .catch(err => {
                    console.error('Lỗi truy vấn dữ liệu từ MongoDB:', err);
                    res.status(500).json({ error: 'Lỗi truy vấn dữ liệu từ MongoDB' });
                })
                .finally(() => {
                    client.close();
                });
        })
        .catch(err => {
            console.error('Kết nối tới MongoDB thất bại:', err);
            res.status(500).json({ error: 'Kết nối tới MongoDB thất bại' });
        });
});

//trang đăng kí
app.post('/dangky', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });

        if (existingUser) {
            return res.send("<script>alert('Tên đăng nhập hoặc email đã tồn tại trong hệ thống. Vui lòng chọn tên đăng nhập hoặc email khác.');</script>");
        }

        // Mã hóa mật khẩu trước khi lưu vào cơ sở dữ liệu
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new UserModel({
            username,
            email,
            password: hashedPassword // Lưu mật khẩu đã mã hóa
        });

        await newUser.save();

        res.redirect('/');
    } catch (error) {
        res.status(400).send('Đăng ký thất bại: ' + error);
    }
});

//trang đăng nhập
app.post('/', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await UserModel.findOne({ username });

        if (!user) {
            return res.send('Tên đăng nhập hoặc mật khẩu không chính xác!');
        }

        // So sánh mật khẩu đã nhập với mật khẩu đã mã hóa trong cơ sở dữ liệu
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (isPasswordMatch) {
            // Lấy địa chỉ IP của người dùng
            const ipAddress = req.ip.replace(/^.*:/, ''); // Loại bỏ tiền tố "::ffff:"
            // Lấy thời gian hiện tại
            const currentTime = new Date();

            // Lưu thông tin đăng nhập vào MongoDB
            await saveLoginInfo(username, ipAddress, currentTime);

            res.redirect(`/home?username=${user.username}`);
        } else {
            res.send('Tên đăng nhập hoặc mật khẩu không chính xác!');
        }
    } catch (error) {
        res.status(400).send('Đăng nhập thất bại: ' + error);
    }
});

// Hàm lưu thông tin đăng nhập vào MongoDB
async function saveLoginInfo(username, ipAddress, loginTime) {
    try {
        // Tạo đối tượng lưu thông tin đăng nhập
        const loginInfo = new LoginInfoModel({
            username: username,
            ipAddress: ipAddress,
            loginTime: loginTime
        });

        // Lưu thông tin đăng nhập vào MongoDB
        await loginInfo.save();
    } catch (error) {
        console.error('Lỗi khi lưu thông tin đăng nhập:', error);
        throw new Error('Đã xảy ra lỗi khi lưu thông tin đăng nhập');
    }
}
// trang mua sắm
app.get('/shopping', async (req, res) => {
    try {
        const username = req.user.username; // Lấy username từ thông tin đăng nhập của người dùng
        const product = await Product.findOne({ username: username });

        if (product) {
            res.render('shopping', {
                productName: product.name,
                productPrice: product.price,
                productClickCount: product.clickCount
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//trang thống kê
app.get('/thongke', async (req, res) => {
    try {
        const products = await Product.find({});
        const userData = {};
        function formatMonetary(amount) {
            return numeral(amount).format('0,0') + 'đ';
        }
        products.forEach(product => {
            const { username, clickCount, totalPrice, createdAt } = product;

            if (!userData[username]) {
                userData[username] = {
                    totalFrequency: 0,
                    totalMonetary: 0,
                    latestPurchaseDate: null,
                    latestPurchaseText: null
                };
            }

            userData[username].totalFrequency += clickCount;
            userData[username].totalMonetary += totalPrice;

            if (!userData[username].latestPurchaseDate || createdAt > userData[username].latestPurchaseDate) {
                userData[username].latestPurchaseDate = createdAt;
            }
        });

        Object.values(userData).forEach(user => {
            if (user.latestPurchaseDate) {
                user.latestPurchaseText = convertRecencyToText(moment().diff(user.latestPurchaseDate, 'days'));
            } else {
                user.latestPurchaseText = 'Chưa mua hàng';
            }
        });

        Object.values(userData).forEach(user => {
            user.totalMonetary = formatMonetary(user.totalMonetary);
        });

        const totalMonetary = Object.values(userData).reduce((total, user) => {
            const monetaryValue = parseInt(user.totalMonetary.replace(/\D/g, ''));
            return total + monetaryValue;
        }, 0);

        const totalMonetaryVNĐ = formatMonetary(totalMonetary);

        // Lưu dữ liệu thống kê vào MongoDB
        const statisticsPromises = Object.entries(userData).map(async ([username, stats]) => {
            const newStatistic = new StatisticsModel({
                username,
                totalFrequency: stats.totalFrequency,
                totalMonetary: stats.totalMonetary,
                latestPurchaseDate: stats.latestPurchaseDate,
                latestPurchaseText: stats.latestPurchaseText
            });
            await newStatistic.save();
        });

        await Promise.all(statisticsPromises);

        // Gửi kết quả về cho client
        res.render('rfm', { userData, totalMonetary: totalMonetaryVNĐ });

    } catch (error) {
        console.error('Lỗi khi tính toán RFM:', error);
        res.status(500).send('Đã xảy ra lỗi khi tính toán RFM');
    }
});


app.get('/admin', (req, res) => {
    res.render('login'); // Sử dụng res.render để render file admin.ejs
});

// Middleware kiểm tra đăng nhập
const checkLogin = async (req, res, next) => {
    const { username, password } = req.body;
    const defaultUsername = 'admin'; // Tên người dùng mặc định
    const defaultPassword = 'admin'; // Mật khẩu mặc định

    // Kiểm tra xem tên người dùng và mật khẩu có trùng khớp với giá trị mặc định không
    if (username === defaultUsername && password === defaultPassword) {
        next(); // Nếu trùng khớp, tiếp tục xử lý
    } else {
        res.send('Tên đăng nhập hoặc mật khẩu không chính xác!'); // Nếu không trùng khớp, gửi thông báo lỗi
    }
};

// Route cho trang đăng nhập admin
app.post('/admin', checkLogin, (req, res) => {
    res.render('admin'); // Nếu đăng nhập thành công, render trang admin
});

app.get('/api/statistics', async (req, res) => {
    try {
        const products = await Product.find({});
        const userData = {};
        function formatMonetary(amount) {
            return numeral(amount).format('0,0') + 'đ';
        }
        products.forEach(product => {
            const { username, clickCount, totalPrice, createdAt } = product;

            if (!userData[username]) {
                userData[username] = {
                    username: username, // Thêm trường username vào đối tượng userData
                    totalFrequency: 0,
                    totalMonetary: 0,
                    latestPurchaseDate: null,
                    latestPurchaseText: null
                };
            }

            userData[username].totalFrequency += clickCount;
            userData[username].totalMonetary += totalPrice;

            if (!userData[username].latestPurchaseDate || createdAt > userData[username].latestPurchaseDate) {
                userData[username].latestPurchaseDate = createdAt;
            }
        });

        Object.values(userData).forEach(user => {
            if (user.latestPurchaseDate) {
                user.latestPurchaseText = convertRecencyToText(moment().diff(user.latestPurchaseDate, 'days'));
            } else {
                user.latestPurchaseText = 'Chưa mua hàng';
            }
            user.totalMonetary = formatMonetary(user.totalMonetary);
        });

        // Gửi dữ liệu tổng hợp về cho client
        res.json(Object.values(userData));

    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu thống kê:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy dữ liệu thống kê' });
    }
});

// Tạo route API để lấy dữ liệu từ bảng loginInfo
app.get('/api/loginInfo', async (req, res) => {
    try {
        // Truy vấn dữ liệu từ bảng loginInfo
        const loginInfoData = await LoginInfoModel.find({});

        // Trả về dữ liệu dưới dạng JSON
        res.json(loginInfoData);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu từ bảng loginInfo:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy dữ liệu từ bảng loginInfo' });
    }
});


// Định nghĩa route API để xóa dữ liệu
app.delete('/api/deleteData/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await Data.findByIdAndDelete(id);
        if (result) {
            res.status(200).send('Dữ liệu đã được xóa thành công');
        } else {
            res.status(404).send('Không tìm thấy dữ liệu để xóa');
        }
    } catch (error) {
        console.error('Lỗi khi xóa dữ liệu:', error);
        res.status(500).send('Đã xảy ra lỗi khi xóa dữ liệu');
    }
});


let data = [];

// tạo api để lấy csdl
app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3000/products');
        const data = response.data;

        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy dữ liệu từ API' });
    }
});

// Tạo API endpoint để lấy danh sách người dùng
app.get('/api/users', async (req, res) => {
    try {
        const users = await UserModel.find({}); // Truy vấn tất cả người dùng từ MongoDB
        res.json(users); // Trả về dữ liệu dưới dạng JSON cho trang admin
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu người dùng từ MongoDB:', error);
        res.status(500).json({ error: 'Lỗi khi lấy dữ liệu người dùng từ MongoDB' });
    }
});

app.get('/api/datas', async (req, res) => {
    try {
        const datas = await Data.find({}); // Truy vấn tất cả dữ liệu từ bảng datas trong MongoDB
        res.json(datas); // Trả về dữ liệu dưới dạng JSON cho ứng dụng gửi yêu cầu
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu từ bảng datas:', error);
        res.status(500).json({ error: 'Lỗi khi lấy dữ liệu từ bảng datas' });
    }
});

//lưu data khách hàng khi xác nhận thanh toán

app.post('/api/saveData', async (req, res) => {
    const requestData = req.body;

    try {
        const productName = req.body.productName;

        const newData = new Data({
            username: requestData.username,
            totalPrice: requestData.totalPrice,
            fullName: requestData.fullName,
            phoneNumber: requestData.phoneNumber,
            email: requestData.email,
            address: requestData.address,
            paymentMethod: requestData.paymentMethod
        });

        await newData.save();

        res.redirect(`/home`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//chuyển đổi number sang text trong /thongke
function convertRecencyToText(recency) {
    if (recency === 0) {
        return "Hôm nay";
    } else if (recency === 1) {
        return "Hôm qua";
    } else if (recency === 2) {
        return "Hôm kia";
    } else if (recency <= 3) {
        return recency + " ngày trước";
    } else {
        return recency + " ngày trước";
    }
}


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
