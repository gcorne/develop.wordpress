jQuery( function() {

	module('Custom Header: ChoiceList', {
		setup: function() {
			api.HeaderTool.currentHeader = new api.HeaderTool.ImageModel();
			this.apiStub = sinon.stub(wp.customize, 'get').returns('foo');
			this.choiceList = new wp.customize.HeaderTool.ChoiceList();
		},
		teardown: function() {
			this.apiStub.restore();
		}
	});

	test('should parse _wpCustomizeHeaderUploads into itself', function() {
		equal(this.choiceList.length, 4);
	});
	
	test('should sort by newest first', function() {
		equal(this.choiceList.at(2).get('header').attachment_id, 1);
		equal(this.choiceList.first().get('header').attachment_id, 3);
	});
	
	module('Custom Header: DefaultsList', {
		setup: function() {
			api.HeaderTool.currentHeader = new api.HeaderTool.ImageModel();
			this.apiStub = sinon.stub(wp.customize, 'get').returns('foo');
			this.choiceList = new wp.customize.HeaderTool.DefaultsList();
		},
		teardown: function() {
			this.apiStub.restore();
		}
	});
	
	test('it should parse _wpCustomizeHeaderDefaults into itself', function() {
		equal(this.choiceList.length, 4);
	});

	test('it parses the default image names', function() {
		equal(this.choiceList.first().get('header').defaultName, 'circle');
		equal(this.choiceList.at(2).get('header').defaultName, 'star');
	});

	module('Custom Header: HeaderImage shouldBeCropped()', {
		setup: function() {
			api.HeaderTool.currentHeader = new api.HeaderTool.ImageModel();
			this.model = new wp.customize.HeaderTool.ImageModel();
			this.model.set({
				themeWidth: 1000,
				themeHeight: 200
			});
		}
	});
	
	test('should not be cropped when the theme does not support flex width or height and the image has the same dimensions of the theme image', function() {
		this.model.set({
			themeFlexWidth: false,
			themeFlexHeight: false,
			imageWidth: 1000,
			imageHeight: 200
		});
		
		equal(this.model.shouldBeCropped(), false);
	});
	
	test('should be cropped when the image has the same dimensions of the theme image it returns true', function() {
		this.model.set({
			themeFlexWidth: false,
			themeFlexHeight: false,
			imageWidth: 2000,
			imageHeight: 400
		});
		
		equal(this.model.shouldBeCropped(), true);
	});

	test('should not be cropped when the theme only supports flex width and the image has the same height as the theme image it returns false', function() {
		this.model.set({
			themeFlexWidth: true,
			themeFlexHeight: false,
			imageWidth: 4000,
			imageHeight: 200
		});
		
		equal(this.model.shouldBeCropped(), false);
	});
	
	test('should not be cropped when the theme only supports flex height and the image has the same width as the theme imagereturns false', function() {
		this.model.set({
			themeFlexWidth: false,
			themeFlexHeight: true,
			imageWidth: 1000,
			imageHeight: 600
		});
		
		equal(this.model.shouldBeCropped(), false);
	});
	
	test('should not be cropped when the theme supports flex height AND width', function() {
		this.model.set({
			themeFlexWidth: true,
			themeFlexHeight: true,
			imageWidth: 10000,
			imageHeight: 8600
		});
		equal(this.model.shouldBeCropped(), false);
	});
});
